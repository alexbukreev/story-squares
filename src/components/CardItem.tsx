// src/components/CardItem.tsx
// All comments must be in English (project rule).

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoItem } from "@/lib/imageLoader";
import { useProjectStore, DEFAULT_TRANSFORM } from "@/store/useProjectStore";
import { exportCardPng, renderCardExactPreviewUrl } from "@/lib/exportImage";
import CardEditorDialog from "@/components/CardEditorDialog";
import PreviewDialog from "@/components/PreviewDialog";

export default function CardItem({ photo }: { photo: PhotfoItem }) {
  const captions = useProjectStore((s) => s.captions);
  const remove = useProjectStore((s) => s.remove);
  const t = useProjectStore((s) => s.transforms[photo.id] ?? DEFAULT_TRANSFORM);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewer, setOpenViewer] = useState(false);


  // Caption (no filename fallback)
  const text = (captions[photo.id] ?? "").trim();

  // Measure card width to choose preview render size
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

  // Render bitmap snapshot that mirrors PNG/PDF (downscaled)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const jobRef = useRef(0); // increments every render request

  useEffect(() => {
    let cancelled = false;
    let prev: string | null = null;
    const myJob = ++jobRef.current;

    const render = async () => {
      if (!w) return;
      setIsRendering(true);
      const dpr = window.devicePixelRatio || 1;
      const px = Math.max(384, Math.min(1024, Math.round(w * dpr))); // clamp for perf

      const url = await renderCardExactPreviewUrl(photo, text, { size: px, transform: t });
      if (cancelled || jobRef.current !== myJob) {
        URL.revokeObjectURL(url);
        return;
      }
      if (prev) URL.revokeObjectURL(prev);
      setPreviewUrl(url);
      prev = url;
      setIsRendering(false);
    };

    render();
    return () => {
      cancelled = true;
      if (prev) URL.revokeObjectURL(prev);
    };
  }, [w, photo.url, text, t.scale, t.tx, t.ty]);

  const onExport = useCallback(async () => {
    await exportCardPng(photo, text, { size: 2048, transform: t });
  }, [photo, text, t]);

  return (
    <>
      <div
        ref={rootRef}
        onClick={() => setOpenViewer(true)}
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.02]"
      >
        {/* Delete */}
        <button
          aria-label="Remove image"
          title="Remove"
          onClick={(e) => { e.stopPropagation(); remove(photo.id); }}
          className="absolute right-1 top-1 z-10 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] shadow hover:bg-background"
        >
          ×
        </button>

        {/* Edit */}
        <button
          aria-label="Edit card"
          title="Edit"
          onClick={(e) => { e.stopPropagation(); setOpenDialog(true); }}
          className="absolute left-1 top-1 z-10 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] shadow hover:bg-background"
        >
          Edit
        </button>

        {/* Export */}
        <button
          aria-label="Export PNG"
          title="Export PNG"
          onClick={(e) => { e.stopPropagation(); onExport(); }}
          className="absolute right-1 bottom-8 z-10 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] shadow hover:bg-background"
        >
          PNG
        </button>

        {/* Snapshot preview (bitmap, matches PNG/PDF). */}
        {previewUrl ? (
          <img src={previewUrl} alt={photo.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-foreground/[0.06]" />
        )}

        {/* Progress overlay while preview is (re)rendering */}
        <div
          className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity ${
            isRendering ? "opacity-100" : "opacity-0"
          } bg-background/80 backdrop-blur-[2px]`}
          aria-hidden={!isRendering}
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/40 border-t-transparent" />
        </div>
      </div>

      <PreviewDialog
        open={openViewer}
        onOpenChange={setOpenViewer}
        photo={photo}
        caption={text}
        transform={t}
        onEdit={() => setOpenDialog(true)}
      />

      <CardEditorDialog open={openDialog} onOpenChange={setOpenDialog} photo={photo} />

    </>
  );
}
