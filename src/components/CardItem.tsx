// src/components/CardItem.tsx
// All comments must be in English (project rule).

import React from "react";
import type { PhotoItem } from "@/lib/imageLoader";

function baseName(name: string) {
  // Strip extension for default caption.
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export default function CardItem({
  photo,
  caption,
}: {
  photo: PhotoItem;
  caption?: string;
}) {
  const text = caption ?? baseName(photo.name);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.02]">
      <img
        src={photo.url}
        alt={photo.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {/* Caption bar */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="bg-background/80 backdrop-blur-sm px-2 py-1 text-xs">
          <div className="truncate">{text}</div>
        </div>
      </div>
    </div>
  );
}
