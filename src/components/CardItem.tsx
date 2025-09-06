// src/components/CardItem.tsx
// All comments must be in English (project rule).

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import type { PhotoItem } from "@/lib/imageLoader";
import { useProjectStore, DEFAULT_TRANSFORM } from "@/store/useProjectStore";
import { exportCardPng } from "@/lib/exportImage";
import CardEditorDialog from "@/components/CardEditorDialog";

function baseName(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export default function CardItem({ photo }: { photo: PhotoItem }) {
  const captions = useProjectStore((s) => s.captions);
  const remove = useProjectStore((s) => s.remove);
  const t = useProjectStore((s) => s.transforms[photo.id] ?? DEFAULT_TRANSFORM);
  const [openDialog, setOpenDialog] = useState(false);

  // Measure card width to mirror PNG proportions for caption bar and font
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const text = (captions[photo.id] ?? "").trim();
  const onExport = useCallback(async () => {
    await exportCardPng(photo, text, { size: 2048, transform: t });
  }, [photo, text, t]);

  return (
    <>
      <div ref={rootRef} className="relative aspect-square w-full overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.02]">
        {/* Delete */}
        <button
          aria-label="Remove image"
          title="Remove"
          onClick={() => remove(photo.id)}
          className="absolute right-1 top-1 z-10 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] shadow hover:bg-background"
        >
          ×
        </button>

        {/* Edit */}
        <button
          aria-label="Edit card"
          title="Edit"
          onClick={() => setOpenDialog(true)}
          className="absolute left-1 top-1 z-10 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] shadow hover:bg-background"
        >
          Edit
        </button>

        {/* Export */}
        <button
          aria-label="Export PNG"
          title="Export PNG"
          onClick={onExport}
          className="absolute right-1 bottom-8 z-10 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] shadow hover:bg-background"
        >
          PNG
        </button>

        {/* Image with transform (view only) */}
        <img
          src={photo.url}
          alt={photo.name}
          className="h-full w-full object-cover"
          style={{
            transform: `translate(${t.tx}%, ${t.ty}%) scale(${t.scale})`,
            transformOrigin: "center",
          }}
          loading="lazy"
        />

        {/* Caption (preview mirrors PNG; multiline, no fallback) */}
        { text && (
          <div className="absolute inset-x-0 bottom-0">
            {(() => {
              // Same proportions as export (see exportImage/pdf): bar 6% of side baseline, font 34% of bar, pad 22% of bar.
              const CAP_BAR_FRAC = 0.06;
              const CAP_FONT_FRAC = 0.34;
              const minBarH = Math.max(24, Math.round(w * CAP_BAR_FRAC)); // small-screen floor
              const pad = Math.max(2, Math.round(minBarH * 0.22));
              const fontSize = Math.max(10, Math.round(minBarH * CAP_FONT_FRAC));
              const lineHeight = Math.round(fontSize * 1.25);

              return (
                <div
                  // Use same visual as PNG defaults
                  style={{
                    backgroundColor: "rgba(255,255,255,0.82)",
                    color: "#111",
                    padding: `${pad}px`,
                    minHeight: `${minBarH}px`,
                    fontSize,
                    lineHeight: `${lineHeight}px`,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {text}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      <CardEditorDialog open={openDialog} onOpenChange={setOpenDialog} photo={photo} />
    </>
  );
}
