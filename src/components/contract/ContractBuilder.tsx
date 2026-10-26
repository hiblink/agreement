import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Eye,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  PencilLine,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendContractEmail } from "@/lib/contracts.functions";
import {
  slugKey,
  usedKeys,
  CONTRACT_TEMPLATES,
  type ContractTemplate,
  type EditableField,
  type FooterConfig,
  type HeaderConfig,
} from "@/lib/contracts";
import { RichEditor, type RichEditorHandle } from "./RichEditor";
import { DocumentView } from "./DocumentView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BuilderInitial {
  id?: string | undefined;
  title: string;
  client_name: string;
  client_email: string;
  header: HeaderConfig;
  body: string;
  fields: EditableField[];
  footer: FooterConfig;
  status?: string | undefined;
  signing_token?: string | undefined;
}

function Section({
  n,
  title,
  description,
  children,
}: {
  n: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-xs">
      <div className="flex flex-col gap-1 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {n}
          </span>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function ContractBuilder({ initial }: { initial: BuilderInitial }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const editor = useRef<RichEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [id, setId] = useState<string | undefined>(initial.id);
  const [title, setTitle] = useState(initial.title);
  const [clientName, setClientName] = useState(initial.client_name);
  const [clientEmail, setClientEmail] = useState(initial.client_email);
  const [header, setHeader] = useState<HeaderConfig>(initial.header);
  const [body, setBody] = useState(initial.body);
  const [fields, setFields] = useState<EditableField[]>(initial.fields);
  const [footer, setFooter] = useState<FooterConfig>(initial.footer);
  const [newField, setNewField] = useState("");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);

  const used = usedKeys(body);

  const updField = (key: string, patch: Partial<EditableField>) => {
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    const key = slugKey(newField);
    if (!key) return;
    if (fields.some((f) => f.key === key)) {
      toast.error("A field with this identifier already exists");
      return;
    }
    setFields([
      ...fields,
      { key, label: newField.trim(), defaultValue: "", isEditableByClient: true, required: false },
    ]);
    setNewField("");
    editor.current?.insertText(`{{${key}}}`);
    toast.success(`Field {{${key}}} added and inserted at cursor`);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, SVG, WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setHeader((prev) => ({ ...prev, logoUrl: result }));
        toast.success("Logo uploaded successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  const applyTemplate = (templateId: string) => {
    const t = CONTRACT_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;

    if (
      window.confirm(
        `Load template "${t.name}"? This will replace the current contract text, dynamic fields, and title.`,
      )
    ) {
      setTitle(t.title);
      setBody(t.body);
      setFields(t.fields);
      setHeader((prev) => ({ ...prev, documentTitle: t.title }));
      setFooter((prev) => ({ ...prev, disclaimer: t.disclaimer }));
      toast.success(`Template "${t.name}" loaded`);
    }
  };

  const save = async (): Promise<string | null> => {
    if (!title.trim()) {
      toast.error("Contract title is required");
      return null;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("You must be signed in to save contracts");
      return null;
    }

    const syncedFields = fields.map((f) =>
      f.key === "client_name" && !f.defaultValue && clientName
        ? { ...f, defaultValue: clientName }
        : f,
    );

    const row = {
      admin_id: u.user.id,
      title: title.trim(),
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      header_config: { ...header, documentTitle: header.documentTitle || title } as never,
      body_content: body,
      editable_fields: syncedFields as never,
      footer_config: footer as never,
    };

    const res = id
      ? await supabase.from("contracts").update(row).eq("id", id).select("id").single()
      : await supabase.from("contracts").insert(row).select("id").single();

    if (res.error) {
      toast.error(res.error.message);
      return null;
    }

    setFields(syncedFields);
    setId(res.data.id);
    qc.invalidateQueries({ queryKey: ["contracts"] });
    return res.data.id;
  };

  const onSave = async (): Promise<void> => {
    setBusy(true);
    const saved = await save();
    setBusy(false);
    if (saved) {
      toast.success("Contract draft saved successfully");
      if (!initial.id) {
        navigate({ to: "/contracts/$id/edit", params: { id: saved }, replace: true });
      }
    }
  };

  const onSend = async (): Promise<void> => {
    if (!clientName.trim()) {
      toast.error("Recipient client name is required");
      return;
    }
    if (!clientEmail.trim() || !/^\S+@\S+\.\S+$/.test(clientEmail.trim())) {
      toast.error("A valid client email address is required");
      return;
    }

    setBusy(true);
    try {
      const saved = await save();
      if (!saved) return;

      const r = await sendContractEmail({ data: { id: saved, origin: window.location.origin } });
      await navigator.clipboard.writeText(r.link).catch(() => {});

      if (r.sent) {
        toast.success("Contract invitation sent! Client link copied to clipboard.");
      } else {
        toast.warning(
          `Contract marked as sent. Email delivery note: ${r.reason || "Provider skipped"}. Secure signing link copied to clipboard.`,
        );
      }
      navigate({ to: "/contracts/$id", params: { id: saved } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1fr_360px]">
      {/* Document Builder Main Canvas */}
      <div className="bg-canvas px-4 py-8 sm:px-8">
        <div className="mx-auto mb-6 flex max-w-[816px] flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-md border-transparent bg-transparent text-xl font-bold tracking-tight shadow-none transition-colors hover:border-border focus-visible:bg-card focus-visible:border-primary"
              placeholder="Contract Title"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Template Picker */}
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="h-9 w-[190px] text-xs bg-card">
                <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder="Load template…" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TEMPLATES.map((tmpl: ContractTemplate) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={view} onValueChange={(v) => setView(v as "edit" | "preview")}>
              <TabsList className="bg-muted">
                <TabsTrigger value="edit" className="text-xs">
                  <PencilLine className="mr-1 h-3.5 w-3.5" /> Builder
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="mr-1 h-3.5 w-3.5" /> Document Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {view === "preview" ? (
          <div className="mx-auto max-w-[816px]">
            <DocumentView
              header={{ ...header, documentTitle: header.documentTitle || title }}
              body={body}
              fields={fields}
              footer={footer}
              clientName={clientName}
              highlight
            />
          </div>
        ) : (
          <div className="mx-auto max-w-[816px] space-y-6">
            {/* 1. Header Section */}
            <Section
              n={1}
              title="Header Section"
              description="Branding, reference details, and agreement title"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Company Name">
                  <Input
                    placeholder="Acme Corp, Inc."
                    value={header.companyName ?? ""}
                    onChange={(e) => setHeader({ ...header, companyName: e.target.value })}
                  />
                </F>

                <F label="Document Title (Header Display)">
                  <Input
                    placeholder={title || "Agreement"}
                    value={header.documentTitle ?? ""}
                    onChange={(e) => setHeader({ ...header, documentTitle: e.target.value })}
                  />
                </F>

                {/* Company Logo Upload & URL */}
                <div className="sm:col-span-2 rounded-md border border-dashed border-border p-3.5 bg-muted/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {header.logoUrl ? (
                        <div className="relative h-12 w-12 rounded border border-border bg-card p-1">
                          <img
                            src={header.logoUrl}
                            alt="Logo preview"
                            className="h-full w-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setHeader({ ...header, logoUrl: "" })}
                            className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow-sm"
                            title="Remove logo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-card text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-foreground">Company Logo</p>
                        <p className="text-[11px] text-muted-foreground">
                          Upload an image file or provide a direct web URL
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Image
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Input
                      className="text-xs h-8"
                      placeholder="Or paste image URL (e.g. https://...)"
                      value={header.logoUrl ?? ""}
                      onChange={(e) => setHeader({ ...header, logoUrl: e.target.value })}
                    />
                  </div>
                </div>

                <F label="Reference Number">
                  <Input
                    placeholder="AGR-2026-001"
                    value={header.referenceNumber ?? ""}
                    onChange={(e) => setHeader({ ...header, referenceNumber: e.target.value })}
                  />
                </F>

                <F label="Agreement Date">
                  <Input
                    type="date"
                    value={header.date ?? ""}
                    onChange={(e) => setHeader({ ...header, date: e.target.value })}
                  />
                </F>
              </div>
            </Section>

            {/* 2. Contract Body Section */}
            <Section
              n={2}
              title="Contract Body"
              description="Rich text agreement and interactive placeholder tags"
            >
              <RichEditor ref={editor} value={body} onChange={setBody} />

              <div className="rounded-md bg-muted/30 p-3 border border-border/60">
                <p className="mb-2 text-xs font-medium text-foreground">
                  Available Dynamic Variables (click to insert at cursor):
                </p>
                <div className="flex flex-wrap gap-2">
                  {fields.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.current?.insertText(`{{${f.key}}}`)}
                      className="field-chip inline-flex items-center gap-1 !text-xs hover:opacity-85 transition-opacity"
                    >
                      {`{{${f.key}}}`}
                      {f.required && <span className="text-destructive font-bold">*</span>}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* 3. Dynamic Fields Section */}
            <Section
              n={3}
              title="Editable Client Fields"
              description="Control which values the client fills out during signing"
            >
              <div className="divide-y divide-border rounded-md border border-border">
                {fields.map((f) => (
                  <div
                    key={f.key}
                    className="grid gap-3 p-3.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                  >
                    <F
                      label={`Field Label · {{${f.key}}}${used.has(f.key) ? "" : " (unused in body)"}`}
                    >
                      <Input
                        value={f.label}
                        onChange={(e) => updField(f.key, { label: e.target.value })}
                      />
                    </F>
                    <F label="Default Value">
                      <Input
                        placeholder="Leave blank or set default"
                        value={f.defaultValue}
                        onChange={(e) => updField(f.key, { defaultValue: e.target.value })}
                      />
                    </F>
                    <div className="flex items-center gap-4 pb-2 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch
                          checked={f.isEditableByClient}
                          onCheckedChange={(v) => updField(f.key, { isEditableByClient: v })}
                        />
                        <span>Client Edits</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch
                          checked={f.required}
                          onCheckedChange={(v) => updField(f.key, { required: v })}
                        />
                        <span>Required</span>
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete field"
                        onClick={() => setFields(fields.filter((x) => x.key !== f.key))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="New field label, e.g. Payment Terms, Project Start Date"
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addField())}
                />
                <Button variant="outline" onClick={addField}>
                  <Plus className="mr-1 h-4 w-4" /> Add Field
                </Button>
              </div>
            </Section>

            {/* 4. Footer Section */}
            <Section
              n={4}
              title="Footer Section"
              description="Admin pre-signature, legal disclaimer, and signatory details"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <F label="Admin Signatory Name">
                  <Input
                    placeholder="e.g. Sarah Jenkins"
                    value={footer.adminSignerName ?? ""}
                    onChange={(e) => setFooter({ ...footer, adminSignerName: e.target.value })}
                  />
                </F>
                <F label="Signatory Title">
                  <Input
                    placeholder="e.g. Managing Director"
                    value={footer.adminSignerTitle ?? ""}
                    onChange={(e) => setFooter({ ...footer, adminSignerTitle: e.target.value })}
                  />
                </F>
                <F label="Pre-signed Signature (Typed cursive)">
                  <Input
                    className="font-signature text-xl"
                    placeholder="Type signature"
                    value={footer.adminSignature ?? ""}
                    onChange={(e) => setFooter({ ...footer, adminSignature: e.target.value })}
                  />
                </F>
              </div>
              <F label="Legal Disclaimer">
                <Textarea
                  rows={3}
                  value={footer.disclaimer ?? ""}
                  onChange={(e) => setFooter({ ...footer, disclaimer: e.target.value })}
                  placeholder="Legal acknowledgment for electronic signatures..."
                />
              </F>
            </Section>
          </div>
        )}
      </div>

      {/* Recipient Settings Panel */}
      <aside className="border-l border-border bg-card p-6 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Recipient Settings</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The client receives a secure, password-less token link to complete permitted fields and
            sign.
          </p>

          <div className="mt-5 space-y-4">
            <F label="Client Name *">
              <Input
                placeholder="Jane Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </F>
            <F label="Client Email *">
              <Input
                type="email"
                placeholder="jane@clientcompany.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </F>
          </div>

          <div className="mt-6 space-y-2.5">
            <Button className="w-full font-medium" onClick={onSend} disabled={busy}>
              <Send className="mr-2 h-4 w-4" />
              {initial.status && initial.status !== "draft"
                ? "Save & Resend Contract"
                : "Save & Send Contract"}
            </Button>
            <Button variant="outline" className="w-full" onClick={onSave} disabled={busy}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            {initial.signing_token && initial.status !== "draft" && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/sign/${initial.signing_token}`,
                  );
                  toast.success("Public signing link copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Public Signing Link
              </Button>
            )}
          </div>
        </div>

        {/* Client Editable Fields Summary */}
        <div className="mt-6 rounded-md bg-muted/40 p-4 text-xs text-muted-foreground border border-border">
          <p className="font-semibold text-foreground">Client Editable Fields</p>
          <ul className="mt-2 space-y-1">
            {fields
              .filter((f) => f.isEditableByClient)
              .map((f) => (
                <li key={f.key} className="flex items-center justify-between">
                  <span>• {f.label}</span>
                  <span className="font-mono text-[10px] text-primary">
                    {f.required ? "Required" : "Optional"}
                  </span>
                </li>
              ))}
            {!fields.some((f) => f.isEditableByClient) && (
              <li className="italic">
                No editable fields (Contract is strictly read-only for client)
              </li>
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}
