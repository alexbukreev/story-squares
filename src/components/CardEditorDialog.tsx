// src/components/CardEditorDialog.tsx
// All comments must be in English (project rule).

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { PhotoItem } from "@/lib/imageLoader";
import { useProjectStore, DEFAULT_TRANSFORM } from "@/store/useProjectStore";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo: PhotoItem;
};

export default function CardEditorDialog({ open, onOpenChange, photo }: Props) {
  const captions = useProjectStore((s) => s.captions);
  const setCaption = useProjectStore((s) => s.setCaption);

  // Store transform (current committed)
  const tStore = useProjectStore((s) => s.transforms[photo.id] ?? DEFAULT_TRANSFORM);
  const setTransform = useProjectStore((s) => s.setTransform);

  // Local caption + local transform (commit both on Save)
  const [cap, setCap] = React.useState(captions[photo.id] ?? "");
  const [t, setT] = React.useState(tStore);

  // Reset local state every time the dialog opens with fresh store values
  React.useEffect(() => {
    if (!open) return;
    setCap(captions[photo.id] ?? "");
    setT(tStore);
  }, [open, captions, photo.id, tStore]);

  // === Natural image size (used to mirror export "cover" math) ===
  const [imgWH, setImgWH] = React.useState<{ w: number; h: number } | null>(null);
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const im = new Image();
    im.onload = () => {
      if (!cancelled) setImgWH({ w: im.naturalWidth, h: im.naturalHeight });
    };
    im.src = photo.url;
    return () => {
      cancelled = true;
    };
  }, [open, photo.url]);

  // === Square frame (mask) measurement ===
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const [frameSize, setFrameSize] = React.useState(0);

  const measureFrame = React.useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    const w = Math.round(el.getBoundingClientRect().width);
    if (w) setFrameSize(w);
  }, []);

  React.useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureFrame());
    ro.observe(el);
    measureFrame(); // initial measurement
    return () => ro.disconnect();
  }, [measureFrame]);

  // try again right after open to ensure layout settled
  React.useEffect(() => {
    if (!open) return;
    requestAnimationFrame(measureFrame);
    setTimeout(measureFrame, 50);
  }, [open, measureFrame]);

  // === Export-accurate draw rect inside the square frame ===
  // Matches exportCardPng: base = cover, then *t.scale*, offsets in % of side.
  const dims = React.useMemo(() => {
    if (!imgWH || !frameSize) return null;
    const S = frameSize;
    const base = Math.max(S / imgWH.w, S / imgWH.h); // object-cover
    const scale = base * t.scale;                     // our zoom over cover
    const dw = Math.round(imgWH.w * scale);
    const dh = Math.round(imgWH.h * scale);
    const dx = Math.round((S - dw) / 2 + (t.tx / 100) * S);
    const dy = Math.round((S - dh) / 2 + (t.ty / 100) * S);
    return { dw, dh, dx, dy };
  }, [imgWH, frameSize, t.scale, t.tx, t.ty]);

  // --- Auto-size textarea (keeps multi-line height on reopen) ---
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);
  const measureRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const m = document.createElement("div");
    m.style.position = "absolute";
    m.style.visibility = "hidden";
    m.style.zIndex = "-1";
    m.style.top = "0";
    m.style.left = "-99999px";
    m.style.whiteSpace = "pre-wrap";
    (m.style as any).overflowWrap = "break-word";
    document.body.appendChild(m);
    measureRef.current = m;
    return () => {
      document.body.removeChild(m);
      measureRef.current = null;
    };
  }, []);

  const autosize = React.useCallback(() => {
    const ta = taRef.current;
    const m = measureRef.current;
    if (!ta || !m) return;
    const cs = getComputedStyle(ta);
    m.style.font = cs.font;
    m.style.letterSpacing = cs.letterSpacing;
    m.style.lineHeight = cs.lineHeight;
    m.style.padding = cs.padding;
    m.style.border = cs.border;
    m.style.boxSizing = cs.boxSizing;
    m.style.width = ta.clientWidth + "px";
    m.textContent = (cap ?? "") + "\n";
    const h = m.scrollHeight;
    ta.style.height = "auto";
    ta.style.height = h + "px";
  }, [cap]);

  React.useLayoutEffect(() => {
    autosize();
  }, [cap, open, autosize]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="
          max-w-[min(96vw,52rem)]
          max-h-[96vh]
          p-2
          overflow-hidden
          flex flex-col
        "
        onOpenAutoFocus={() => {
          requestAnimationFrame(() => {
            autosize();
            setTimeout(autosize, 50);
            measureFrame();
            const el = taRef.current;
            if (el) {
              el.focus({ preventScroll: true });
              const len = el.value.length;
              try {
                el.setSelectionRange(len, len);
              } catch {}
            }
          });
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit card</DialogTitle>
          <DialogDescription className="sr-only">
            Adjust zoom and position of the photo and edit the caption.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">
          <div className="grid gap-4">
            {/* Square preview (export-accurate positioning inside a square mask) */}
            <div
              ref={frameRef}
              className="
                mx-auto w-full
                max-w-[min(86vw,70vh)]
                aspect-square
                rounded-xl border bg-muted/20 overflow-hidden relative
              "
            >
              {dims ? (
                // Exact math as export: the image has real pixel size (dw x dh)
                // and we translate it inside the square frame by dx/dy in *pixels*.
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="absolute top-0 left-0 select-none pointer-events-none"
                  style={{
                    width: `${dims.dw}px`,
                    height: `${dims.dh}px`,
                    maxWidth: "none",
                    transform: `translate3d(${dims.dx}px, ${dims.dy}px, 0)`,
                  }}
                  draggable={false}
                />
              ) : (
                // Fallback while measuring — mirror final math (cover + translate% + scale)
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="h-full w-full object-cover will-change-transform select-none"
                  style={{
                    transform: `translate(${t.tx}%, ${t.ty}%) scale(${t.scale})`,
                    transformOrigin: "center",
                  }}
                  draggable={false}
                />

              )}

              {/* Caption editor overlay (auto-growing textarea) */}
              <div className="absolute inset-x-0 bottom-0">
                <div className="relative bg-background/80 backdrop-blur-sm px-2 pt-1 pb-2">
                  <Textarea
                    ref={taRef}
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    onInput={autosize}
                    rows={1}
                    className="
                      pointer-events-auto w-full resize-none overflow-hidden
                      bg-transparent border-0 outline-none
                      focus-visible:ring-0 focus-visible:outline-none
                      p-0 text-xs leading-snug min-h-0
                    "
                    placeholder="Type caption…"
                    aria-label="Caption"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            {/* Controls (same width as the image above) */}
            <div className="mx-auto w-full max-w-[min(86vw,70vh)]">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Zoom</Label>
                    <span className="tabular-nums opacity-70">{t.scale.toFixed(2)}×</span>
                  </div>
                  <Slider
                    value={[t.scale]}
                    min={1}
                    max={3}
                    step={0.01}
                    onValueChange={([v]) => setT((prev) => ({ ...prev, scale: v }))}
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Horizontal</Label>
                    <span className="tabular-nums opacity-70">{t.tx.toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[t.tx]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setT((prev) => ({ ...prev, tx: v }))}
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Vertical</Label>
                    <span className="tabular-nums opacity-70">{t.ty.toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[t.ty]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setT((prev) => ({ ...prev, ty: v }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => setT(DEFAULT_TRANSFORM)}>
            Reset image
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCaption(photo.id, cap);
                setTransform(photo.id, t); // commit image transform
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
