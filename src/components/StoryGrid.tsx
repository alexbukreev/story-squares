// src/components/StoryGrid.tsx
// All comments must be in English (project rule).

import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/store/useProjectStore";
import { getTemplate } from "@/features/templates";

function pct(n: number) {
  return `${(n * 100).toFixed(4)}%`;
}

export default function StoryGrid() {
  const templateId = useProjectStore((s) => s.templateId);
  const photos     = useProjectStore((s) => s.photos);

  const tpl = useMemo(() => getTemplate(templateId), [templateId]);
  const usedPhotos = photos.slice(0, tpl.slots.length);

  return (
    <section className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-80">
            Template: <b>{tpl.name}</b> • Slots: <b>{tpl.slots.length}</b> • Photos used:{" "}
            <b>{usedPhotos.length}</b>
          </div>
        </div>

        <div className="mt-4 grid place-items-center">
          {/* Square preview area */}
          <div className="relative w-full max-w-xl aspect-square rounded-xl border border-foreground/20 bg-foreground/[0.03] overflow-hidden">
            {tpl.slots.map((slot, i) => {
              const ph = usedPhotos[i]; // take first N photos
              const mask =
                slot.mask === "circle"
                  ? "rounded-full"
                  : slot.mask === "rounded"
                  ? "rounded-xl"
                  : "";
              return (
                <div
                  key={slot.id}
                  className={`absolute ${mask} overflow-hidden border border-foreground/25`}
                  style={{
                    left: pct(slot.x),
                    top: pct(slot.y),
                    width: pct(slot.w),
                    height: pct(slot.h),
                  }}
                >
                  {ph ? (
                    <img
                      src={ph.url}
                      alt={ph.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] opacity-60">
                      {slot.id.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute left-1 top-1 text-[10px] px-1 rounded bg-background/80">
                    {i + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}
