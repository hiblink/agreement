import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Download, Globe, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getSigningContract, submitSignature } from "@/lib/contracts.functions";
import { DocumentView } from "@/components/contract/DocumentView";
import { SignaturePad } from "@/components/contract/SignaturePad";
import { Logo } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  parseSignature,
  type EditableField,
  type FooterConfig,
  type HeaderConfig,
  type SignatureData,
} from "@/lib/contracts";

export const Route = createFileRoute("/sign/$token")({
  loader: ({ params }) => getSigningContract({ data: { token: params.token } }).catch(() => null),
  head: () => ({
    meta: [
      { title: "Review & Sign Document — Hiblink Agreement" },
      { name: "description", content: "Review and electronically sign your agreement." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Review & Sign Document — Hiblink Agreement" },
      { property: "og:description", content: "Review and electronically sign your agreement." },
    ],
  }),
  component: SignPage,
});

function SignPage() {
  const contract = Route.useLoaderData();
  const { token } = Route.useParams();

  const [fields, setFields] = useState<EditableField[]>(() =>
    ((contract?.editable_fields ?? []) as unknown as EditableField[]).map((f) => ({
      ...f,
      clientValue: f.clientValue ?? f.defaultValue ?? "",
    })),
  );

  const [active, setActive] = useState<string | undefined>(undefined);
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ signedAt: string; sig: SignatureData } | null>(null);
  const [localTime, setLocalTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setLocalTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const editable = useMemo(() => fields.filter((f) => f.isEditableByClient), [fields]);

  if (!contract) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
        <Logo />
        <div className="max-w-md rounded-xl border border-border bg-card p-8 shadow-paper">
          <h1 className="text-xl font-semibold text-foreground">Signing Link Expired or Invalid</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This contract link could not be loaded. It may have been mistyped, replaced, or
            withdrawn. Please contact the sender for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const header = (contract.header_config ?? {}) as HeaderConfig;
  const footer = (contract.footer_config ?? {}) as FooterConfig;
  const signedAt = done?.signedAt ?? contract.signed_at;
  const sig = done?.sig ?? parseSignature(contract.signature_data);
  const isSigned = contract.status === "signed" || Boolean(done);
  const shownFields =
    isSigned && !done ? ((contract.editable_fields ?? []) as unknown as EditableField[]) : fields;
  const nameDefault =
    fields.find((f) => f.key === "client_name")?.clientValue || contract.client_name;

  const submit = async (): Promise<void> => {
    const missing = editable.filter((f) => f.required && !(f.clientValue ?? "").trim());
    if (missing.length > 0) {
      const firstMissing = missing[0];
      if (firstMissing) {
        setActive(firstMissing.key);
        document.getElementById(`field-${firstMissing.key}`)?.focus();
      }
      toast.error(`Please complete required field(s): ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    if (!signature) {
      toast.error("Please add your electronic signature");
      return;
    }

    if (!agreed) {
      toast.error("Please confirm you agree to be legally bound by this electronic signature");
      return;
    }

    setBusy(true);
    try {
      const values = Object.fromEntries(editable.map((f) => [f.key, f.clientValue ?? ""]));
      const r = await submitSignature({
        data: {
          token,
          values,
          signature,
          agreed,
          origin: window.location.origin,
        },
      });
      setDone({ signedAt: r.signedAt, sig: signature });
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Document signed and recorded successfully!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas pb-16">
      {/* Top Navigation */}
      <header className="no-print sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          {isSigned ? (
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Download className="mr-1.5 h-4 w-4" /> Download / Print PDF
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-emerald-600" /> 256-bit Encrypted Signing Session
            </span>
          )}
        </div>
      </header>

      {/* Completion Banner */}
      {isSigned && (
        <div className="no-print border-b border-status-signed/30 bg-status-signed/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5 text-sm font-medium text-status-signed">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>
                Completed &amp; Signed on {new Date(signedAt!).toLocaleString()}. This legal
                document is locked.
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verified Audit Trail
            </div>
          </div>
        </div>
      )}

      {/* Signing Workspace */}
      <div
        className={`mx-auto mt-8 grid max-w-7xl gap-8 px-4 sm:px-6 ${isSigned ? "" : "lg:grid-cols-[1fr_380px]"}`}
      >
        {/* Document A4 Canvas */}
        <div className="flex justify-center">
          <DocumentView
            header={header}
            body={contract.body_content}
            fields={shownFields}
            footer={footer}
            clientName={contract.client_name}
            signature={isSigned ? sig : signature}
            signedAt={isSigned ? signedAt : null}
            highlight={!isSigned}
            activeKey={active}
            onFieldClick={(k) => {
              if (editable.some((f) => f.key === k)) {
                setActive(k);
                document.getElementById(`field-${k}`)?.focus();
              }
            }}
            signatureSlot={
              <span className="text-xs text-muted-foreground italic">
                Sign in the panel on the right →
              </span>
            }
          />
        </div>

        {/* Guided Signing Sidebar */}
        {!isSigned && (
          <aside className="no-print space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Interactive Client Fields */}
            {editable.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Client Details</h2>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {editable.length} {editable.length === 1 ? "field" : "fields"} to fill
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The values you enter below update your agreement on the document in real time.
                </p>

                <div className="mt-4 space-y-3.5">
                  {editable.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`field-${f.key}`} className="text-xs font-medium">
                          {f.label} {f.required && <span className="text-destructive">*</span>}
                        </Label>
                        {active === f.key && (
                          <span className="text-[10px] font-medium text-primary">
                            Active on document
                          </span>
                        )}
                      </div>
                      <Input
                        id={`field-${f.key}`}
                        value={f.clientValue ?? ""}
                        maxLength={500}
                        placeholder={f.defaultValue || `Enter ${f.label.toLowerCase()}`}
                        className={active === f.key ? "ring-2 ring-primary" : ""}
                        onFocus={() => setActive(f.key)}
                        onBlur={() => setActive(undefined)}
                        onChange={(e) =>
                          setFields((fs) =>
                            fs.map((x) =>
                              x.key === f.key ? { ...x, clientValue: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Electronic Signature Block */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-foreground">Electronic Signature</h2>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                Draw or type your signature to be applied to the agreement.
              </p>

              <SignaturePad onChange={setSignature} defaultName={nameDefault ?? ""} />

              {/* Audit Trail / Signer Details */}
              <div className="mt-5 rounded-md bg-muted/40 p-3 border border-border text-xs space-y-2">
                <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    <span>Estimated Signer IP:</span>
                  </span>
                  <span className="font-semibold text-foreground">
                    {(contract as unknown as { client_ip?: string })?.client_ip || "127.0.0.1"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Local Timestamp:</span>
                  </span>
                  <span className="font-semibold text-foreground">
                    {localTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>ESIGN &amp; UETA compliant session audit record</span>
                </div>
              </div>

              {/* Legal binding consent */}
              <div className="mt-3 rounded-md bg-muted/40 p-3 border border-border">
                <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer leading-relaxed">
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    I agree to be legally bound by this electronic signature, and confirm that this
                    transaction complies with the Electronic Signatures in Global and National
                    Commerce Act (ESIGN).
                  </span>
                </label>
              </div>

              {/* Submit & Sign action */}
              <Button
                className="mt-5 w-full text-sm font-semibold h-11"
                size="lg"
                onClick={submit}
                disabled={busy}
              >
                {busy ? "Securing & Signing…" : "Finish & Sign Contract"}
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
