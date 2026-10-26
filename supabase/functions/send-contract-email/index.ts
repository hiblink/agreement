// Supabase Edge Function: send-contract-email
// Handles email notifications via Resend API for contract events:
// 1. "contract_sent": Sends invitation with unique signing token link to the client
// 2. "contract_signed": Sends confirmation to BOTH Admin and Client with signing summary and view link

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface SentPayload {
  trigger: "contract_sent";
  clientEmail: string;
  clientName?: string;
  contractTitle: string;
  companyName?: string;
  signingUrl: string;
}

interface SignedPayload {
  trigger: "contract_signed";
  clientEmail: string;
  adminEmail: string;
  contractTitle: string;
  signerName: string;
  signedAt: string;
  documentUrl: string;
}

type EmailPayload = SentPayload | SignedPayload;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function esc(s: string): string {
  return (s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] || c,
  );
}

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contract Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 32px 36px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 18px; font-weight: 700; color: #4338ca; letter-spacing: -0.02em;">
                      ✦ Inkline Contracts
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 36px 28px 36px; background-color: #ffffff;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0;">This email was sent via Inkline Digital Contract Management. All electronic signatures collected are legally binding in accordance with the ESIGN Act and UETA.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
    <tr>
      <td align="center" style="border-radius: 8px; background-color: #4338ca;">
        <a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: 0.01em;">
          ${esc(label)} →
        </a>
      </td>
    </tr>
  </table>`;
}

async function sendViaResend(
  apiKey: string,
  fromEmail: string,
  to: string[],
  subject: string,
  html: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        error: data?.message || `Resend API returned status ${res.status}`,
      };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

Deno.serve(async (req: Request) => {
  // Preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") || "Inkline Contracts <onboarding@resend.dev>";

  try {
    const payload: EmailPayload = await req.json();

    if (!payload || !payload.trigger) {
      return new Response(JSON.stringify({ error: "Missing required 'trigger' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // When RESEND_API_KEY is not configured yet, return a structured notice without crashing
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          warning: "RESEND_API_KEY environment variable is not configured.",
          payloadReceived: { trigger: payload.trigger },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (payload.trigger === "contract_sent") {
      const { clientEmail, clientName, contractTitle, companyName, signingUrl } = payload;
      if (!clientEmail || !signingUrl) {
        return new Response(
          JSON.stringify({ error: "clientEmail and signingUrl are required for contract_sent" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const subject = `Please review and sign: ${contractTitle || "Agreement"}`;
      const senderText = companyName ? `${companyName}` : "The sender";
      const greeting = clientName ? `Hi ${clientName},` : "Hello,";

      const bodyHtml = `
        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
          You have a document waiting for signature
        </h1>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
          ${esc(greeting)}
        </p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
          <strong>${esc(senderText)}</strong> has invited you to review and sign <strong>${esc(contractTitle)}</strong>.
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
          Please click the button below to inspect the terms, fill in required client fields, and apply your electronic signature. No account or password is required.
        </p>
        ${primaryButton(signingUrl, "Review & Sign Agreement")}
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5; word-break: break-all;">
          Or copy and paste this link in your browser:<br />
          <a href="${esc(signingUrl)}" style="color: #4338ca; text-decoration: underline;">${esc(signingUrl)}</a>
        </p>
      `;

      const result = await sendViaResend(
        resendApiKey,
        fromEmail,
        [clientEmail],
        subject,
        emailLayout(bodyHtml),
      );

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.trigger === "contract_signed") {
      const { clientEmail, adminEmail, contractTitle, signerName, signedAt, documentUrl } = payload;
      if (!documentUrl) {
        return new Response(
          JSON.stringify({ error: "documentUrl is required for contract_signed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const formattedDate = signedAt ? new Date(signedAt).toUTCString() : new Date().toUTCString();
      const subject = `Signed & Completed: ${contractTitle || "Agreement"}`;

      const bodyHtml = `
        <div style="display: inline-block; padding: 6px 12px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 13px; font-weight: 600; color: #047857; margin-bottom: 16px;">
          ✓ Fully Executed &amp; Locked
        </div>
        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
          Contract execution completed
        </h1>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
          <strong>${esc(contractTitle)}</strong> has been successfully signed by <strong>${esc(signerName)}</strong> on <strong>${esc(formattedDate)}</strong>.
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
          The contract terms and submitted client fields are now permanently locked. Both parties can inspect and download a copy of the executed document at any time using the link below:
        </p>
        ${primaryButton(documentUrl, "View Executed Contract")}
        <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
          <strong>Audit Details:</strong><br />
          • Document: ${esc(contractTitle)}<br />
          • Signer: ${esc(signerName)} (${esc(clientEmail || "Client")})<br />
          • Executed At: ${esc(formattedDate)}
        </div>
      `;

      const recipients = Array.from(new Set([clientEmail, adminEmail].filter(Boolean)));
      if (recipients.length === 0) {
        return new Response(JSON.stringify({ error: "No recipient emails provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await sendViaResend(
        resendApiKey,
        fromEmail,
        recipients,
        subject,
        emailLayout(bodyHtml),
      );

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported trigger type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
