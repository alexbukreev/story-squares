// src/components/UploadPanel.tsx
// All comments must be in English (project rule).

import React, { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { filesToPhotoItems } from "@/lib/imageLoader";
import { useProjectStore } from "@/store/useProjectStore";

export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <section className="mt-4 space-y-4">
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm opacity-80">
          {/* Selected -> Cards */}
          Cards: <b>{photos.length}</b> / {max}
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

      {/* Drag & drop box — commented out per request
      <div
        className="grid place-items-center rounded-xl border border-dashed p-8 text-center transition border-foreground/30"
      >
        <div className="space-y-1">
          <div className="text-base font-medium">Drag & drop images here</div>
          <div className="text-xs opacity-70">or click “Choose images”</div>
          {photos.length < max && (
            <div className="text-xs opacity-70">You can add {Math.max(0, max - photos.length)} more</div>
          )}
        </div>
      </div>
      */}
    </section>
  );
}
