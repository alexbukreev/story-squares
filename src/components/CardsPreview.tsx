// src/components/CardsPreview.tsx
// All comments must be in English (project rule).

import React from "react";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/store/useProjectStore";
import CardItem from "@/components/CardItem";

export default function CardsPreview() {
  const photos = useProjectStore((s) => s.photos);

  return (
    <section className="space-y-3">
      <Card className="p-4">
        <div className="text-sm opacity-80 mb-3">
          Cards: <b>{photos.length}</b>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <CardItem key={p.id} photo={p} />
          ))}
        </div>
      </Card>
    </section>
  );
}
