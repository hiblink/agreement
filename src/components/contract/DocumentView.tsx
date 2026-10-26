import { CheckCircle2, FileSignature } from "lucide-react";
import {
  renderBody,
  type EditableField,
  type FooterConfig,
  type HeaderConfig,
  type SignatureData,
} from "@/lib/contracts";

interface Props {
  header: HeaderConfig;
  body: string;
  fields: EditableField[];
  footer: FooterConfig;
  clientName?: string | undefined;
  signature?: SignatureData | null | undefined;
  signedAt?: string | null | undefined;
  highlight?: boolean | undefined;
  activeKey?: string | undefined;
  onFieldClick?: ((key: string) => void) | undefined;
  signatureSlot?: React.ReactNode | undefined;
}

export function SignatureMark({ sig, className = "" }: { sig: SignatureData; className?: string }) {
  if (sig.type === "draw") {
    return <img src={sig.value} alt="Signature" className={`h-14 object-contain ${className}`} />;
  }
  return (
    <span className={`font-signature text-4xl text-ink select-none ${className}`}>{sig.value}</span>
  );
}

export function DocumentView({
  header,
  body,
  fields,
  footer,
  clientName,
  signature,
  signedAt,
  highlight,
  activeKey,
  onFieldClick,
  signatureSlot,
}: Props) {
  const html = renderBody(body, fields, { highlight, activeKey });
  const nameField = fields.find((f) => f.key === "client_name");
  const displayName =
    (nameField && ((nameField.clientValue ?? "") || nameField.defaultValue)) ||
    clientName ||
    "Client";

  return (
    <article className="paper-sheet relative flex flex-col rounded-sm border border-border/70 bg-paper px-10 py-12 shadow-paper sm:px-16 sm:py-14">
      {/* Header Section */}
      <header className="flex items-start justify-between gap-6 border-b border-border/80 pb-6">
        <div className="flex items-center gap-4">
          {header.logoUrl ? (
            <img
              src={header.logoUrl}
              alt="Logo"
              className="h-12 max-w-[140px] rounded object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSignature className="h-6 w-6" />
            </div>
          )}
          <div>
            <p className="text-base font-semibold tracking-tight text-paper-foreground">
              {header.companyName || "Your Company"}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Digital Contract
            </p>
          </div>
        </div>
        <dl className="text-right text-xs text-muted-foreground space-y-1">
          {header.referenceNumber && (
            <div>
              <dt className="inline font-medium">Reference: </dt>
              <dd className="inline font-mono font-semibold text-paper-foreground">
                {header.referenceNumber}
              </dd>
            </div>
          )}
          {header.date && (
            <div>
              <dt className="inline font-medium">Date: </dt>
              <dd className="inline text-paper-foreground">{header.date}</dd>
            </div>
          )}
        </dl>
      </header>

      {/* Document Title */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-paper-foreground sm:text-4xl">
          {header.documentTitle || "Agreement"}
        </h1>
        {signedAt && (
          <div className="inline-flex items-center gap-1.5 self-start rounded-md border border-emerald-600/70 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Signed on {new Date(signedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Dynamic Contract Body with interactive or highlighted fields */}
      <div
        className="doc-prose mt-6 flex-1 cursor-text"
        onClick={(e) => {
          const el = (e.target as HTMLElement).closest("[data-field]") as HTMLElement | null;
          const k = el?.dataset["field"];
          if (k && onFieldClick) onFieldClick(k);
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Footer Section */}
      <footer className="mt-14 border-t border-border/80 pt-8">
        <div className="grid gap-10 sm:grid-cols-2">
          {/* Admin pre-signed signature block */}
          <div className="flex flex-col justify-end">
            <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
              For {header.companyName || "the Company"}
            </p>
            <div className="mt-3 flex h-16 items-end border-b border-paper-foreground/40 pb-1">
              {footer.adminSignature ? (
                <span className="font-signature text-3xl text-ink">{footer.adminSignature}</span>
              ) : (
                <span className="text-xs italic text-muted-foreground">
                  Authorized Signature on File
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-paper-foreground">
              {footer.adminSignerName || "Authorized Signatory"}
            </p>
            {footer.adminSignerTitle && (
              <p className="text-xs text-muted-foreground">{footer.adminSignerTitle}</p>
            )}
          </div>

          {/* Client signature block */}
          <div className="flex flex-col justify-end">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                Client Signature
              </p>
              {signedAt && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                </span>
              )}
            </div>
            <div className="mt-3 flex h-16 items-end border-b border-paper-foreground/40 pb-1">
              {signature ? <SignatureMark sig={signature} /> : signatureSlot}
            </div>
            <p className="mt-2 text-sm font-medium text-paper-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              Date: {signedAt ? new Date(signedAt).toLocaleString() : "Pending signature"}
            </p>
          </div>
        </div>

        {/* Legal Disclaimer */}
        {footer.disclaimer && (
          <p className="mt-10 rounded-md bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground border border-border/50">
            {footer.disclaimer}
          </p>
        )}

        {/* Page numbering aesthetic */}
        <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-4 text-[10px] tracking-widest text-muted-foreground font-mono">
          <span>INKLINE SECURE CONTRACT</span>
          <span>PAGE 1 OF 1</span>
        </div>
      </footer>
    </article>
  );
}
