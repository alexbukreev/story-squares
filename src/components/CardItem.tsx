// src/components/CardItem.tsx
// All comments must be in English (project rule).

import React, { useCallback, useMemo, useState } from "react";
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

  const current = captions[photo.id];
  const fallback = useMemo(() => baseName(photo.name), [photo.name]);
  const text = current ?? fallback;

  const onExport = useCallback(async () => {
    await exportCardPng(photo, text, { size: 2048 }); // transform support добавим следующим шагом
  }, [photo, text]);

  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.02]">
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

        {/* Caption (view only) */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="bg-background/80 backdrop-blur-sm px-2 py-1 text-xs">
            <div className="truncate">{text}</div>
          </div>
        </div>

      </div>

      <CardEditorDialog open={openDialog} onOpenChange={setOpenDialog} photo={photo} />
    </>
  );
}
