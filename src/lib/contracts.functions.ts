import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EditableField } from "./contracts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanOrigin(o: unknown): string {
  if (typeof o !== "string") throw new Error("Invalid origin");
  const u = new URL(o);
  if (u.protocol !== "https:" && u.hostname !== "localhost") throw new Error("Invalid origin");
  return u.origin;
}

/** Admin: mark contract sent and email the client its signing link. */
export const sendContractEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; origin: string }) => {
    if (!UUID_RE.test(d?.id)) throw new Error("Invalid id");
    return { id: d.id, origin: cleanOrigin(d.origin) };
  })
  .handler(async ({ data, context }) => {
    const { data: c, error } = await context.supabase
      .from("contracts")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !c) throw new Error("Contract not found");
    if (!c.client_email) throw new Error("Client email is required");
    if (c.status === "draft") {
      await context.supabase
        .from("contracts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", c.id);
    }
    const { notifyContractSent } = await import("./email.server");
    const link = `${data.origin}/sign/${c.signing_token}`;
    const header = (c.header_config ?? {}) as { companyName?: string };
    const r = await notifyContractSent({
      clientEmail: c.client_email,
      clientName: c.client_name,
      title: c.title,
      company: header.companyName ?? "",
      signingLink: link,
    });
    return { ...r, link };
  });

/** Public: load contract by signing token; marks it viewed. */
export const getSigningContract = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => {
    if (!UUID_RE.test(d?.token)) throw new Error("Invalid link");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("contracts")
      .select(
        "id,title,client_name,client_email,header_config,body_content,editable_fields,footer_config,status,signature_data,signed_at,signer_ip",
      )
      .eq("signing_token", data.token)
      .maybeSingle();
    if (!c || c.status === "draft") return null;
    if (c.status === "sent") {
      await supabaseAdmin
        .from("contracts")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", c.id);
      c.status = "viewed";
    }

    let detectedIp = c.signer_ip || "127.0.0.1";
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const headers = getRequest()?.headers;
      if (headers) {
        const ipHeader =
          headers.get("cf-connecting-ip") ||
          headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        if (ipHeader) detectedIp = ipHeader;
      }
    } catch {
      /* ignore if not running in active request */
    }

    return { ...c, client_ip: detectedIp };
  });

/** Public: submit field values + signature. Only client-editable fields can change. */
export const submitSignature = createServerFn({ method: "POST" })
  .validator(
    (d: {
      token: string;
      values: Record<string, string>;
      signature: { type: string; value: string };
      agreed: boolean;
      origin: string;
    }) => {
      if (!UUID_RE.test(d?.token)) throw new Error("Invalid link");
      if (!d.agreed) throw new Error("You must agree to sign electronically");
      const sig = d.signature;
      if (
        !sig ||
        (sig.type !== "draw" && sig.type !== "type") ||
        typeof sig.value !== "string" ||
        !sig.value.trim()
      )
        throw new Error("Signature is required");
      if (sig.value.length > 500_000) throw new Error("Signature too large");
      if (sig.type === "draw" && !sig.value.startsWith("data:image/png;base64,"))
        throw new Error("Invalid signature");
      if (sig.type === "type" && sig.value.length > 100)
        throw new Error("Typed signature too long");
      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.values ?? {})) {
        if (typeof v === "string") values[k] = v.slice(0, 1000);
      }
      return {
        token: d.token,
        values,
        signature: { type: sig.type, value: sig.value },
        origin: cleanOrigin(d.origin),
      };
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { data: c } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("signing_token", data.token)
      .maybeSingle();
    if (!c || c.status === "draft") throw new Error("Contract not found");
    if (c.status === "signed") throw new Error("This contract has already been signed");

    const fields = ((c.editable_fields ?? []) as unknown as EditableField[]).map((f) => {
      if (!f.isEditableByClient) return f;
      const v = (data.values[f.key] ?? "").trim();
      return { ...f, clientValue: v || null };
    });
    const missing = fields.filter((f) => f.required && !((f.clientValue ?? "") || f.defaultValue));
    if (missing.length)
      throw new Error(`Please complete: ${missing.map((f) => f.label).join(", ")}`);

    const headers = getRequest().headers;
    const ip =
      headers.get("cf-connecting-ip") ||
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const signedAt = new Date().toISOString();
    const nameField = fields.find((f) => f.key === "client_name");
    const signerName =
      (nameField && ((nameField.clientValue ?? "") || nameField.defaultValue)) || c.client_name;

    const { error } = await supabaseAdmin
      .from("contracts")
      .update({
        editable_fields: fields as never,
        signature_data: JSON.stringify(data.signature),
        signer_ip: ip,
        signed_at: signedAt,
        status: "signed",
      })
      .eq("id", c.id)
      .neq("status", "signed");
    if (error) throw new Error("Could not save signature");

    try {
      const { notifyContractSigned } = await import("./email.server");
      const { data: admin } = await supabaseAdmin.auth.admin.getUserById(c.admin_id);
      await notifyContractSigned({
        clientEmail: c.client_email,
        adminEmail: admin?.user?.email || "",
        title: c.title,
        signerName,
        signedAt: new Date(signedAt).toUTCString(),
        viewLink: `${data.origin}/sign/${c.signing_token}`,
      });
    } catch (e) {
      console.error("Signed email failed", e);
    }
    return { signedAt };
  });
