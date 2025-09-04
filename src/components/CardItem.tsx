// src/components/CardItem.tsx
// All comments must be in English (project rule).

import React, { useCallback, useMemo, useState } from "react";
import type { PhotoItem } from "@/lib/imageLoader";
import { useProjectStore } from "@/store/useProjectStore";
import { exportCardPng } from "@/lib/exportImage";

function baseName(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export default function CardItem({ photo }: { photo: PhotoItem }) {
  const captions   = useProjectStore((s) => s.captions);
  const setCaption = useProjectStore((s) => s.setCaption);
  const remove     = useProjectStore((s) => s.remove);

  const [editing, setEditing] = useState(false);
  const current  = captions[photo.id];
  const fallback = useMemo(() => baseName(photo.name), [photo.name]);
  const text     = current ?? fallback;

  const save = useCallback((val: string) => {
    setCaption(photo.id, val);
    setEditing(false);
  }, [photo.id, setCaption]);

  const onKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      save((e.target as HTMLInputElement).value);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  }, [save]);

  const onExport = useCallback(async () => {
    await exportCardPng(photo, text, { size: 2048 });
  }, [photo, text]);

  return (
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

      {/* Export */}
      <button
        aria-label="Export PNG"
        title="Export PNG"
        onClick={onExport}
        className="absolute right-1 bottom-8 z-10 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] shadow hover:bg-background"
      >
        PNG
      </button>

      <img
        src={photo.url}
        alt={photo.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />

      {/* Caption (click to edit) */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="bg-background/80 backdrop-blur-sm px-2 py-1 text-xs">
          {editing ? (
            <input
              autoFocus
              defaultValue={text}
              onBlur={(e) => save(e.currentTarget.value)}
              onKeyDown={onKey}
              className="w-full bg-transparent outline-none"
              aria-label="Edit caption"
            />
          ) : (
            <button
              className="truncate w-full text-left"
              onClick={() => setEditing(true)}
              aria-label="Edit caption"
              title="Click to edit"
            >
              {text}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
