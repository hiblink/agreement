export type ContractStatus = "draft" | "sent" | "viewed" | "signed";

export interface EditableField {
  key: string;
  label: string;
  defaultValue: string;
  clientValue?: string | null | undefined;
  isEditableByClient: boolean;
  required: boolean;
}

export interface HeaderConfig {
  logoUrl?: string | undefined;
  companyName?: string | undefined;
  documentTitle?: string | undefined;
  referenceNumber?: string | undefined;
  date?: string | undefined;
}

export interface FooterConfig {
  disclaimer?: string | undefined;
  adminSignerName?: string | undefined;
  adminSignerTitle?: string | undefined;
  adminSignature?: string | undefined; // typed name rendered in cursive
}

export interface SignatureData {
  type: "draw" | "type";
  value: string; // data URL or typed text
}

export const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
};

export const DEFAULT_FIELDS: EditableField[] = [
  {
    key: "client_name",
    label: "Client Name",
    defaultValue: "",
    isEditableByClient: true,
    required: true,
  },
  {
    key: "client_company",
    label: "Client Company",
    defaultValue: "",
    isEditableByClient: true,
    required: false,
  },
  {
    key: "client_address",
    label: "Client Address",
    defaultValue: "",
    isEditableByClient: true,
    required: true,
  },
];

export const DEFAULT_BODY = `<h2>1. Scope of Services</h2>
<p>This Service Agreement is entered into between the Company and <b>{{client_name}}</b> of <b>{{client_company}}</b>, located at <b>{{client_address}}</b>.</p>
<h2>2. Term &amp; Termination</h2>
<p>This agreement begins on the date of the last signature and continues until terminated by either party with 30 days written notice.</p>
<h2>3. Compensation &amp; Payment</h2>
<p>The Client agrees to remit payment for all approved invoices within 30 days of receipt.</p>
<h2>4. Confidentiality &amp; Governing Law</h2>
<p>Both parties agree to protect proprietary information and submit to the jurisdiction of the state courts.</p>`;

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  fields: EditableField[];
  body: string;
  disclaimer: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "service_agreement",
    name: "General Service Agreement",
    description: "Standard commercial services terms, compensation, and confidentiality.",
    title: "Master Services Agreement",
    fields: [
      {
        key: "client_name",
        label: "Client Name",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "client_company",
        label: "Client Company",
        defaultValue: "",
        isEditableByClient: true,
        required: false,
      },
      {
        key: "client_address",
        label: "Client Address",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "service_fee",
        label: "Service Fee ($)",
        defaultValue: "$5,000 / month",
        isEditableByClient: false,
        required: true,
      },
    ],
    body: `<h2>1. Engagement &amp; Services</h2>
<p>The Company agrees to provide professional services to <b>{{client_name}}</b>, representing <b>{{client_company}}</b>, located at <b>{{client_address}}</b>.</p>
<h2>2. Payment &amp; Retainer</h2>
<p>The total fee for services rendered under this agreement shall be <b>{{service_fee}}</b>, payable in net 30 days from invoice issuance.</p>
<h2>3. Warranties &amp; Standard of Care</h2>
<p>The Company warrants that all services will be performed in a professional and workmanlike manner consistent with established industry standards.</p>
<h2>4. Term &amp; Termination</h2>
<p>Either party may terminate this agreement upon 30 days written notice to the other party.</p>`,
    disclaimer:
      "By signing electronically, the parties agree that this electronic signature is the legal equivalent of a handwritten signature and that this agreement is binding under the ESIGN Act and UETA.",
  },
  {
    id: "nda",
    name: "Non-Disclosure Agreement (NDA)",
    description:
      "Mutual protection of confidential information, trade secrets, and proprietary data.",
    title: "Mutual Non-Disclosure Agreement",
    fields: [
      {
        key: "client_name",
        label: "Recipient Name",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "client_company",
        label: "Recipient Company",
        defaultValue: "",
        isEditableByClient: true,
        required: false,
      },
      {
        key: "client_address",
        label: "Recipient Address",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "purpose",
        label: "Purpose of Disclosure",
        defaultValue: "Evaluating potential commercial partnership",
        isEditableByClient: false,
        required: true,
      },
    ],
    body: `<h2>1. Purpose &amp; Confidential Information</h2>
<p>The Disclosing Party agrees to share confidential business information with <b>{{client_name}}</b> of <b>{{client_company}}</b> (located at <b>{{client_address}}</b>) strictly for the purpose of <b>{{purpose}}</b>.</p>
<h2>2. Non-Disclosure Obligations</h2>
<p>The Recipient agrees to hold and maintain all Confidential Information in strictest confidence and shall not disclose it to any third party without prior written authorization.</p>
<h2>3. Term of Protection</h2>
<p>These confidentiality obligations shall remain in effect for a period of two (2) years from the date of final signature.</p>
<h2>4. Return of Materials</h2>
<p>Upon written request, Recipient shall immediately return or destroy all tangible copies of Confidential Information.</p>`,
    disclaimer:
      "This document constitutes a legally binding Non-Disclosure Agreement. Any unauthorized disclosure constitutes irreparable harm entitling injunctive relief.",
  },
  {
    id: "contractor",
    name: "Independent Contractor Agreement",
    description: "Deliverables, independent status, IP assignment, and compensation.",
    title: "Independent Contractor Agreement",
    fields: [
      {
        key: "client_name",
        label: "Contractor Name",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "client_company",
        label: "Contractor Entity / DBA",
        defaultValue: "",
        isEditableByClient: true,
        required: false,
      },
      {
        key: "client_address",
        label: "Contractor Address",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "deliverable_scope",
        label: "Deliverable Scope",
        defaultValue: "Software engineering and technical architecture",
        isEditableByClient: false,
        required: true,
      },
    ],
    body: `<h2>1. Independent Status</h2>
<p>This Agreement confirms that <b>{{client_name}}</b> (DBA <b>{{client_company}}</b>), located at <b>{{client_address}}</b>, acts strictly as an independent contractor and not as an employee.</p>
<h2>2. Scope of Deliverables</h2>
<p>The Contractor shall perform and deliver the following services: <b>{{deliverable_scope}}</b> in accordance with specifications approved by the Company.</p>
<h2>3. Intellectual Property Assignment</h2>
<p>All work product, code, documentation, and inventions created by the Contractor pursuant to this Agreement shall belong solely and exclusively to the Company as work made for hire.</p>
<h2>4. Tax Responsibility</h2>
<p>The Contractor is solely responsible for all federal, state, and local taxes, insurance, and withholdings.</p>`,
    disclaimer:
      "The parties acknowledge that this contract confirms an independent contractor relationship and does not create an employer-employee agency.",
  },
  {
    id: "software_dev",
    name: "Software Development Agreement",
    description: "Custom software engineering, milestone delivery, testing, and acceptance.",
    title: "Custom Software Development Agreement",
    fields: [
      {
        key: "client_name",
        label: "Client Contact",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "client_company",
        label: "Client Company",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "client_address",
        label: "Client Address",
        defaultValue: "",
        isEditableByClient: true,
        required: true,
      },
      {
        key: "project_name",
        label: "Project Name",
        defaultValue: "Cloud Platform Modernization",
        isEditableByClient: false,
        required: true,
      },
    ],
    body: `<h2>1. Project Overview</h2>
<p>The Developer agrees to design, build, and deliver software for <b>{{client_company}}</b> (Contact: <b>{{client_name}}</b>, Address: <b>{{client_address}}</b>) for the project titled <b>{{project_name}}</b>.</p>
<h2>2. Acceptance &amp; Review Period</h2>
<p>The Client shall have ten (10) business days from delivery of each milestone to review, test, and provide written notice of acceptance or defect reports.</p>
<h2>3. Bug Fixes &amp; Warranty</h2>
<p>Developer provides a thirty (30) day warranty post-launch to remediate reproducible defects at no additional charge.</p>
<h2>4. Limitation of Liability</h2>
<p>Neither party shall be liable for indirect, incidental, or consequential damages arising out of this agreement.</p>`,
    disclaimer:
      "All electronic signatures recorded hereon are verified and binding under applicable electronic signature laws.",
  },
];

export const FIELD_KEY_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function slugKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function fieldValue(f: EditableField): string {
  return (f.clientValue ?? "") || f.defaultValue || "";
}

export function parseSignature(raw: string | null | undefined): SignatureData | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s && (s.type === "draw" || s.type === "type") && typeof s.value === "string") return s;
  } catch {
    /* ignore */
  }
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Light sanitizer for admin-authored contract HTML. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
}

/** Replace {{key}} tokens with highlighted, escaped values. */
export function renderBody(
  html: string,
  fields: EditableField[],
  opts: { highlight?: boolean | undefined; activeKey?: string | undefined } = {},
): string {
  const map = new Map(fields.map((f) => [f.key, f]));
  return sanitizeHtml(html).replace(FIELD_KEY_RE, (_m, key: string) => {
    const f = map.get(key);
    const v = f ? fieldValue(f) : "";
    const text = v ? escapeHtml(v) : escapeHtml(f?.label ?? key);
    if (!opts.highlight) return v ? text : `<span style="opacity:.5">[${text}]</span>`;
    const active =
      opts.activeKey === key ? ' style="outline:2px solid currentColor;outline-offset:1px"' : "";
    return `<span class="field-chip" data-field="${escapeHtml(key)}"${active}>${text}</span>`;
  });
}

export function usedKeys(html: string): Set<string> {
  const keys = new Set<string>();
  for (const m of html.matchAll(FIELD_KEY_RE)) {
    const k = m[1];
    if (k) keys.add(k);
  }
  return keys;
}
