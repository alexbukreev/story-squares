// src/components/CardsPreview.tsx
// All comments must be in English (project rule).

import React, { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProjectStore } from "@/store/useProjectStore";
import CardItem from "@/components/CardItem";

// Local copy to avoid importing from lib/pdf at build time.
type ExportProgress = {
  done: number; total: number; elapsedMs: number; etaMs?: number; pct: number;
};

function fmtMs(ms: number) {
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

export default function CardsPreview() {
  const photos   = useProjectStore((s) => s.photos);
  const captions = useProjectStore((s) => s.captions);

  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<ExportProgress | null>(null);

  const pct = prog?.pct ?? 0;
  const status = useMemo(() => {
    if (!prog) return "";
    const left = prog.etaMs ?? 0;
    return `Rendering ${prog.done}/${prog.total} • ${pct}% • elapsed ${fmtMs(prog.elapsedMs)}${prog.done < prog.total ? ` • ETA ${fmtMs(left)}` : ""}`;
  }, [prog, pct]);

  const onExportPdf = useCallback(async () => {
    if (!photos.length || busy) return;
    try {
      setBusy(true);
      setProg({ done: 0, total: photos.length, elapsedMs: 0, pct: 0 });

      // Lazy load only when needed:
      const { exportCardsToPdf } = await import("@/lib/pdf");
      await exportCardsToPdf(photos, captions, {
        size: 2048,
        onProgress: (p) => setProg(p),
      });
    } finally {
      setBusy(false);
    }
  }, [photos, captions, busy]);

  return (
    <section className="space-y-1">
      <Card className="p-4">
        <div className="text-sm opacity-80 mb-3">
          Cards: <b>{photos.length}</b>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <CardItem key={p.id} photo={p} />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {busy || prog ? (
            <>
              <Progress value={pct} className="h-2" />
              <div className="text-xs opacity-70">{status}</div>
            </>
          ) : null}
          <div className="flex justify-end">
            <Button size="sm" onClick={onExportPdf} disabled={!photos.length || busy}>
              {busy ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
