import { useEffect, useRef, useState } from "react";
import { Eraser, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SignatureData } from "@/lib/contracts";

export function SignaturePad({
  onChange,
  defaultName,
}: {
  onChange: (s: SignatureData | null) => void;
  defaultName?: string;
}) {
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState(defaultName ?? "");
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const isManuallyEdited = useRef(false);

  useEffect(() => {
    if (!isManuallyEdited.current && defaultName && defaultName !== typed) {
      setTyped(defaultName);
    }
  }, [defaultName, typed]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(c).color;
  }, [tab]);

  useEffect(() => {
    if (tab === "type") onChange(typed.trim() ? { type: "type", value: typed.trim() } : null);
    else
      onChange(
        hasInk.current && canvasRef.current
          ? { type: "draw", value: canvasRef.current.toDataURL("image/png") }
          : null,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, typed]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "draw" | "type")}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="draw" className="flex items-center gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          <span>Draw signature</span>
        </TabsTrigger>
        <TabsTrigger value="type">Type signature</TabsTrigger>
      </TabsList>
      <TabsContent value="draw">
        <div className="relative rounded-md border border-dashed border-input bg-card">
          <canvas
            ref={canvasRef}
            className="h-40 w-full touch-none text-ink cursor-crosshair"
            onPointerDown={(e) => {
              drawing.current = true;
              setHasDrawn(true);
              e.currentTarget.setPointerCapture(e.pointerId);
              const ctx = e.currentTarget.getContext("2d")!;
              const p = pos(e);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const ctx = e.currentTarget.getContext("2d")!;
              const p = pos(e);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
              hasInk.current = true;
            }}
            onPointerUp={(e) => {
              drawing.current = false;
              if (hasInk.current)
                onChange({ type: "draw", value: e.currentTarget.toDataURL("image/png") });
            }}
          />
          {!hasDrawn && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground/50 select-none">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span>Sign here with pencil, stylus, touch, or mouse</span>
            </div>
          )}
          <span className="pointer-events-none absolute bottom-3 left-4 right-4 border-b border-muted-foreground/30" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={clear}
          >
            <Eraser className="mr-1 h-4 w-4" /> Clear
          </Button>
        </div>
      </TabsContent>
      <TabsContent value="type" className="space-y-3">
        <Input
          value={typed}
          onChange={(e) => {
            isManuallyEdited.current = true;
            setTyped(e.target.value);
          }}
          placeholder="Type your full name"
          maxLength={60}
        />
        <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-input bg-card">
          <span className="font-signature text-5xl text-ink">{typed || "Your signature"}</span>
        </div>
      </TabsContent>
    </Tabs>
  );
}
