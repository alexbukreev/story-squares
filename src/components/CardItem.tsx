// src/components/CardItem.tsx
// All comments must be in English (project rule).

import React, { useCallback, useState, useEffect, useRef } from "react";
import type { PhotoItem } from "@/lib/imageLoader";
import { useProjectStore, DEFAULT_TRANSFORM } from "@/store/useProjectStore";
import { exportCardPng, renderCardExactPngUrl } from "@/lib/exportImage";
import CardEditorDialog from "@/components/CardEditorDialog";

export default function CardItem({ photo }: { photo: PhotoItem }) {
  const captions = useProjectStore((s) => s.captions);
  const remove = useProjectStore((s) => s.remove);
  const t = useProjectStore((s) => s.transforms[photo.id] ?? DEFAULT_TRANSFORM);
  const [openDialog, setOpenDialog] = useState(false);

  // caption (no filename fallback)
  const text = (captions[photo.id] ?? "").trim();

  // Render bitmap snapshot that mirrors PNG/PDF
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    const render = async () => {
      // генерим *тот же* PNG размером 2048 и просто показываем уменьшенную копию
      const url = await renderCardExactPngUrl(photo, text, { size: 2048, transform: t });
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      if (revoked) URL.revokeObjectURL(revoked);
      setPreviewUrl(url);
      revoked = url;
    };

    render();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [photo.url, text, t.scale, t.tx, t.ty]);


  const onExport = useCallback(async () => {
    await exportCardPng(photo, text, { size: 2048, transform: t });
  }, [photo, text, t]);

  return (
    <>
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.02]"
      >
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

        {/* Snapshot preview (bitmap, matches PNG/PDF output) */}
        <img src={previewUrl ?? photo.url} alt={photo.name} className="h-full w-full object-cover" />
      </div>

      <CardEditorDialog open={openDialog} onOpenChange={setOpenDialog} photo={photo} />
    </>
  );
}
