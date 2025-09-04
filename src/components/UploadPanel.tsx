// src/components/UploadPanel.tsx
// All comments must be in English (project rule).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { filesToPhotoItems } from "@/lib/imageLoader";
import { useProjectStore } from "@/store/useProjectStore";

export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  const photos = useProjectStore((s) => s.photos);
  const max    = useProjectStore((s) => s.max);
  const add    = useProjectStore((s) => s.add);
  const clear  = useProjectStore((s) => s.clear);
  const remove = useProjectStore((s) => s.remove);

  const remaining = Math.max(0, max - photos.length);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const arr = Array.from(files).slice(0, remaining);
    const items = filesToPhotoItems(arr, remaining);
    add(items);
  }, [add, remaining]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ""; // allow same file selection twice
  }, [handleFiles]);

  // drag & drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onEnter = (e: DragEvent) => { prevent(e); setIsOver(true); };
    const onOver  = (e: DragEvent) => { prevent(e); setIsOver(true); };
    const onLeave = (e: DragEvent) => { prevent(e); setIsOver(false); };
    const onDrop  = (e: DragEvent) => {
      prevent(e); setIsOver(false);
      const dt = e.dataTransfer;
      handleFiles(dt?.files && dt.files.length ? dt.files : null);
    };

    el.addEventListener("dragenter", onEnter);
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);

    return () => {
      el.removeEventListener("dragenter", onEnter);
      el.removeEventListener("dragover", onOver);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, [handleFiles]);

  return (
    <section className="space-y-4 mt-5">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm opacity-80">
            Selected: <b>{photos.length}</b> / {max}
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onInputChange}
            />
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              Choose images
            </Button>
            <Button variant="destructive" onClick={clear} disabled={!photos.length}>
              Clear
            </Button>
          </div>
        </div>

        <div
          ref={dropRef}
          className={[
            "mt-4 grid place-items-center rounded-xl border border-dashed p-8 text-center transition",
            isOver ? "border-foreground/80 bg-foreground/5" : "border-foreground/30",
          ].join(" ")}
        >
          <div className="space-y-1">
            <div className="text-base font-medium">Drag & drop images here</div>
            <div className="text-xs opacity-70">or click “Choose images”</div>
            {photos.length < max && (
              <div className="text-xs opacity-70">You can add {remaining} more</div>
            )}
          </div>
        </div>
      </Card>

      {!!photos.length && (
        <Card className="p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {photos.map((it) => (
              <figure key={it.id} className="group relative rounded-lg overflow-hidden border border-foreground/15">
                <img src={it.url} alt={it.name} className="aspect-square w-full object-cover" loading="lazy" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-background/70 text-[10px] px-1 py-0.5 truncate">
                  {it.name}
                </figcaption>
                <button
                  onClick={() => remove(it.id)}
                  className="absolute right-1 top-1 hidden rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] shadow group-hover:block"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </figure>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
