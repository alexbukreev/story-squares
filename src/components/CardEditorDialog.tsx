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

  const t = useProjectStore((s) => s.transforms[photo.id] ?? DEFAULT_TRANSFORM);
  const setTransform = useProjectStore((s) => s.setTransform);
  const resetTransform = useProjectStore((s) => s.resetTransform);

  // Local caption state (commit on Save)
  const initialCap = captions[photo.id] ?? "";
  const [cap, setCap] = React.useState(initialCap);
  
  // --- Auto-size textarea ---
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  const measureRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const m = document.createElement("div");
    // keep it off-screen and non-interfering
    m.style.position = "absolute";
    m.style.visibility = "hidden";
    m.style.zIndex = "-1";
    m.style.top = "0";
    m.style.left = "-99999px";
    m.style.whiteSpace = "pre-wrap";   // same as textarea wrapping
    (m.style as any).overflowWrap = "break-word"; // modern replacement for word-wrap
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

    // copy computed styles that affect text metrics
    const cs = getComputedStyle(ta);
    m.style.font = cs.font;
    m.style.letterSpacing = cs.letterSpacing;
    m.style.lineHeight = cs.lineHeight;
    m.style.padding = cs.padding;
    m.style.border = cs.border;
    m.style.boxSizing = cs.boxSizing;

    // match current width of textarea
    m.style.width = ta.clientWidth + "px";

    // set text; trailing newline ensures last line height counted
    m.textContent = (cap ?? "") + "\n";

    const h = m.scrollHeight; // measured content height
    ta.style.height = "auto";
    ta.style.height = h + "px";
  }, [cap]);

  
  React.useLayoutEffect(() => { autosize(); }, [cap, open, autosize]);

  // Re-run autosize when dialog opens *after* layout; also keep in sync on width changes.
  React.useEffect(() => {
    if (!open) return;
    const el = taRef.current;
    if (!el) return;

    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      autosize();
      // run once more next frame (fonts/backdrop blur may settle a frame later)
      requestAnimationFrame(() => { if (!cancelled) autosize(); });
    };

    // wait until element is actually laid out (width > 0)
    const ensureVisible = () => {
      if (cancelled) return;
      if (el.isConnected && el.clientWidth > 0) {
        // after layout & paint
        requestAnimationFrame(run);
      } else {
        requestAnimationFrame(ensureVisible);
      }
    };

    const raf = requestAnimationFrame(ensureVisible);

    // keep height in sync if width changes
    const ro = new ResizeObserver(run);
    ro.observe(el);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [open, cap, autosize]);

  React.useEffect(() => {
    setCap(captions[photo.id] ?? "");
  }, [captions, photo.id]);

  const onSave = () => {
    setCaption(photo.id, cap);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="
          max-w-[min(92vw,52rem)]
          max-h-[92vh]
          p-4
          overflow-hidden
          flex flex-col
        "
        onOpenAutoFocus={() => {
          // Диалог уже отрендерен и видим — можно точно измерять
          requestAnimationFrame(() => {
            autosize();
            // ещё один тик — на случай подгрузки шрифтов/blur
            setTimeout(autosize, 50);

            // курсор в конец текста (по просьбе)
            const el = taRef.current;
            if (el) {
              el.focus({ preventScroll: true });
              const len = el.value.length;
              try { el.setSelectionRange(len, len); } catch {}
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
            {/* Square preview that never exceeds viewport */}
            <div
              className="
                mx-auto w-full
                max-w-[min(86vw,70vh)]
                aspect-square
                rounded-xl border bg-muted/20 overflow-hidden relative
              "
            >
              {/* Image with transform */}
              <img
                src={photo.url}
                className="h-full w-full object-cover"
                style={{
                  transform: `translate(${t.tx}%, ${t.ty}%) scale(${t.scale})`,
                  transformOrigin: "center",
                }}
              />

              {/* Caption editor overlay (auto-growing textarea) */}
              <div className="absolute inset-x-0 bottom-0">
                <div className="relative bg-background/80 backdrop-blur-sm px-2 pt-1 pb-2">
                <Textarea
                  ref={taRef}
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                  onInput={autosize}                // keep height in sync while typing
                  rows={1}
                  className="
                    pointer-events-auto w-full resize-none overflow-hidden
                    bg-transparent border-0 outline-none
                    focus-visible:ring-0 focus-visible:outline-none
                    p-0 text-xs leading-snug 
                    min-h-0
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

            {/* Controls */}
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
                  onValueChange={([v]) => setTransform(photo.id, { scale: v })}
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
                  onValueChange={([v]) => setTransform(photo.id, { tx: v })}
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
                  onValueChange={([v]) => setTransform(photo.id, { ty: v })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => resetTransform(photo.id)}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
