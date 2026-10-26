// Server-only email helper using Resend and Supabase Edge Function fallback.
// Emails are skipped (not failed) when no Resend API key is configured.

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; reason?: string | undefined }> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { sent: false, reason: "RESEND_API_KEY not configured" };
  const from = process.env["RESEND_FROM_EMAIL"] || "Contracts <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    let reason = `Email provider error (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) reason = parsed.message;
    } catch {
      /* ignore JSON parse failure */
    }
    console.error("Resend error", res.status, text);
    return { sent: false, reason };
  }
  return { sent: true };
}

export async function notifyContractSent(params: {
  clientEmail: string;
  clientName: string;
  title: string;
  company: string;
  signingLink: string;
}): Promise<{ sent: boolean; reason?: string | undefined }> {
  // 1. Attempt through Supabase Edge Function if edge URL or credentials exist
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.functions.invoke("send-contract-email", {
      body: {
        trigger: "contract_sent",
        clientEmail: params.clientEmail,
        clientName: params.clientName,
        contractTitle: params.title,
        companyName: params.company,
        signingUrl: params.signingLink,
      },
    });

    if (!error && data?.success) {
      return { sent: true };
    }
  } catch (err) {
    console.warn("Edge function invocation fallback to direct email:", err);
  }

  // 2. Direct fallback using Resend API
  return sendEmail(
    params.clientEmail,
    `Please sign: ${params.title}`,
    sentEmailHtml({
      clientName: params.clientName,
      title: params.title,
      company: params.company,
      link: params.signingLink,
    }),
  );
}

export async function notifyContractSigned(params: {
  clientEmail: string;
  adminEmail: string;
  title: string;
  signerName: string;
  signedAt: string;
  viewLink: string;
}): Promise<{ sent: boolean; reason?: string | undefined }> {
  // 1. Attempt through Supabase Edge Function
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.functions.invoke("send-contract-email", {
      body: {
        trigger: "contract_signed",
        clientEmail: params.clientEmail,
        adminEmail: params.adminEmail,
        contractTitle: params.title,
        signerName: params.signerName,
        signedAt: params.signedAt,
        documentUrl: params.viewLink,
      },
    });

    if (!error && data?.success) {
      return { sent: true };
    }
  } catch (err) {
    console.warn("Edge function invocation fallback to direct email:", err);
  }

  // 2. Direct fallback using Resend API
  const recipients = Array.from(new Set([params.clientEmail, params.adminEmail].filter(Boolean)));
  if (recipients.length === 0) return { sent: false, reason: "No recipients" };

  const html = signedEmailHtml({
    title: params.title,
    signerName: params.signerName,
    signedAt: params.signedAt,
    link: params.viewLink,
  });

  const results = await Promise.all(
    recipients.map((to) => sendEmail(to, `Signed: ${params.title}`, html)),
  );
  const anySent = results.some((r) => r.sent);
  return { sent: anySent, reason: results.find((r) => !r.sent)?.reason };
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function layout(inner: string) {
  return `<div style="background:#ffffff;font-family:Arial,sans-serif;color:#1e293b;padding:32px"><div style="max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;padding:32px">${inner}<p style="color:#94a3b8;font-size:12px;margin-top:32px">Sent via Inkline Digital Contracts</p></div></div>`;
}

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#4338ca;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${esc(label)}</a>`;

export function sentEmailHtml(p: {
  clientName: string;
  title: string;
  company: string;
  link: string;
}) {
  return layout(
    `<h2 style="margin:0 0 12px">You have a document to sign</h2><p>Hi ${esc(p.clientName || "there")},</p><p>${esc(p.company || "The sender")} has sent you <b>${esc(p.title)}</b> for review and electronic signature.</p><p style="margin:24px 0">${button(p.link, "Review & sign")}</p><p style="font-size:13px;color:#64748b">Or open: ${esc(p.link)}</p>`,
  );
}

export function signedEmailHtml(p: {
  title: string;
  signerName: string;
  signedAt: string;
  link: string;
}) {
  return layout(
    `<h2 style="margin:0 0 12px">Agreement signed</h2><p><b>${esc(p.title)}</b> was signed by ${esc(p.signerName)} on ${esc(p.signedAt)}.</p><p style="margin:24px 0">${button(p.link, "View completed agreement")}</p>`,
  );
}
