// src/components/UploadPanel.tsx
// All comments must be in English (project rule).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { filesToPhotoItems } from "@/lib/imageLoader";
import { useProjectStore } from "@/store/useProjectStore";

export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef  = useRef<HTMLDivElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  const photos = useProjectStore((s) => s.photos);
  const max    = useProjectStore((s) => s.max);
  const add    = useProjectStore((s) => s.add);
  const clear  = useProjectStore((s) => s.clear);

  const remaining = Math.max(0, max - photos.length);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const arr   = Array.from(files).slice(0, remaining);
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
    <section className="mt-4 space-y-4">
      {/* Top row */}
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

      {/* Drop zone */}
      <div
        ref={dropRef}
        className={[
          "grid place-items-center rounded-xl border border-dashed p-8 text-center transition",
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
    </section>
  );
}
