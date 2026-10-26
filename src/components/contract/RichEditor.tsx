import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Bold, Heading2, Italic, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RichEditorHandle {
  insertText: (t: string) => void;
}

export const RichEditor = forwardRef<
  RichEditorHandle,
  { value: string; onChange: (html: string) => void }
>(function RichEditor({ value, onChange }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const lastRange = useRef<Range | null>(null);

  useEffect(() => {
    if (el.current && el.current.innerHTML !== value) el.current.innerHTML = value;
  }, [value]);

  const save = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el.current?.contains(sel.anchorNode))
      lastRange.current = sel.getRangeAt(0).cloneRange();
  };

  const exec = (cmd: string, arg?: string) => {
    el.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(el.current!.innerHTML);
  };

  useImperativeHandle(ref, () => ({
    insertText: (t: string) => {
      el.current?.focus();
      const sel = window.getSelection();
      if (lastRange.current && sel) {
        sel.removeAllRanges();
        sel.addRange(lastRange.current);
      }
      document.execCommand("insertText", false, t);
      onChange(el.current!.innerHTML);
    },
  }));

  const tools = [
    { icon: Bold, cmd: "bold", label: "Bold" },
    { icon: Italic, cmd: "italic", label: "Italic" },
    { icon: Underline, cmd: "underline", label: "Underline" },
    { icon: Heading2, cmd: "formatBlock", arg: "H2", label: "Heading" },
    { icon: List, cmd: "insertUnorderedList", label: "Bullets" },
    { icon: ListOrdered, cmd: "insertOrderedList", label: "Numbered" },
  ];

  return (
    <div className="rounded-md border border-input bg-paper">
      <div className="flex flex-wrap gap-1 border-b border-border p-1.5">
        {tools.map((t) => (
          <Button
            key={t.label}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={t.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd, t.arg)}
          >
            <t.icon className="h-4 w-4" />
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("formatBlock", "P")}
        >
          Paragraph
        </Button>
      </div>
      <div
        ref={el}
        contentEditable
        suppressContentEditableWarning
        className="doc-prose min-h-[320px] px-5 py-4 text-paper-foreground outline-none"
        onInput={() => onChange(el.current!.innerHTML)}
        onKeyUp={save}
        onMouseUp={save}
        onBlur={save}
      />
    </div>
  );
});
