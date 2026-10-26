import { describe, expect, it } from "vitest";
import {
  fieldValue,
  parseSignature,
  renderBody,
  sanitizeHtml,
  slugKey,
  usedKeys,
  CONTRACT_TEMPLATES,
  type EditableField,
} from "@/lib/contracts";

describe("Contracts Domain Logic", () => {
  it("slugs labels into valid snake_case identifiers", () => {
    expect(slugKey("Client Name")).toBe("client_name");
    expect(slugKey("Payment Terms & Conditions")).toBe("payment_terms_conditions");
    expect(slugKey("  Special Note! ")).toBe("special_note");
  });

  it("extracts field values prioritizing clientValue over defaultValue", () => {
    const f1: EditableField = {
      key: "test",
      label: "Test",
      defaultValue: "Default",
      clientValue: "Client Provided",
      isEditableByClient: true,
      required: false,
    };
    expect(fieldValue(f1)).toBe("Client Provided");

    const f2: EditableField = {
      key: "test",
      label: "Test",
      defaultValue: "Default",
      clientValue: "",
      isEditableByClient: true,
      required: false,
    };
    expect(fieldValue(f2)).toBe("Default");
  });

  it("extracts used keys from body markup", () => {
    const body = "<p>Hello {{client_name}} at {{client_company}}.</p>";
    const keys = usedKeys(body);
    expect(keys.has("client_name")).toBe(true);
    expect(keys.has("client_company")).toBe(true);
    expect(keys.has("other")).toBe(false);
  });

  it("replaces variable placeholders accurately in renderBody", () => {
    const body = "<p>Welcome {{client_name}}.</p>";
    const fields: EditableField[] = [
      {
        key: "client_name",
        label: "Client Name",
        defaultValue: "Acme",
        isEditableByClient: true,
        required: true,
      },
    ];

    const rendered = renderBody(body, fields, { highlight: false });
    expect(rendered).toContain("Welcome Acme.");

    const highlighted = renderBody(body, fields, { highlight: true });
    expect(highlighted).toContain('class="field-chip" data-field="client_name"');

    const activeHighlighted = renderBody(body, fields, {
      highlight: true,
      activeKey: "client_name",
    });
    expect(activeHighlighted).toContain("outline:2px solid currentColor");
  });

  it("sanitizes potentially malicious HTML tags in contract bodies", () => {
    const malicious = '<p>Good text</p><script>alert("xss")</script><iframe src="//evil.com"></iframe>';
    const cleaned = sanitizeHtml(malicious);
    expect(cleaned).not.toContain("<script>");
    expect(cleaned).not.toContain("alert");
    expect(cleaned).not.toContain("iframe");
    expect(cleaned).toContain("<p>Good text</p>");
  });

  it("parses valid drawn and typed signatures", () => {
    expect(parseSignature(null)).toBeNull();
    expect(parseSignature("invalid")).toBeNull();

    const drawn = JSON.stringify({ type: "draw", value: "data:image/png;base64,1234" });
    expect(parseSignature(drawn)).toEqual({ type: "draw", value: "data:image/png;base64,1234" });

    const typed = JSON.stringify({ type: "type", value: "John Doe" });
    expect(parseSignature(typed)).toEqual({ type: "type", value: "John Doe" });
  });

  it("provides built-in contract templates with valid fields and content", () => {
    expect(CONTRACT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    for (const t of CONTRACT_TEMPLATES) {
      expect(t.title).toBeTruthy();
      expect(t.body).toBeTruthy();
      expect(t.fields.length).toBeGreaterThan(0);
      expect(t.disclaimer).toBeTruthy();
    }
  });
});
