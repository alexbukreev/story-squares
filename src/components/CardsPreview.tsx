// src/components/CardsPreview.tsx
// All comments must be in English (project rule).

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useProjectStore } from "@/store/useProjectStore";
import CardItem from "@/components/CardItem";

type ExportProgress = { done: number; total: number; elapsedMs: number; etaMs?: number; pct: number; };

function fmtMs(ms: number) {
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

export default function CardsPreview() {
  const photos      = useProjectStore((s) => s.photos);
  const captions    = useProjectStore((s) => s.captions);
  const transforms  = useProjectStore((s) => s.transforms);

  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<ExportProgress | null>(null);
  const inFlight = useRef(false);

  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [quality, setQuality] = useState(85); // 50..95 (for jpeg)

  const pct = prog?.pct ?? 0;
  const status = useMemo(() => {
    if (!prog) return "";
    const left = prog.etaMs ?? 0;
    return `Rendering ${prog.done}/${prog.total} • ${pct}% • elapsed ${fmtMs(prog.elapsedMs)}${prog.done < prog.total ? ` • ETA ${fmtMs(left)}` : ""}`;
  }, [prog, pct]);

  const onExportPdf = useCallback(async () => {
    if (!photos.length || inFlight.current) return;
    inFlight.current = true;
    try {
      setBusy(true);
      setProg({ done: 0, total: photos.length, elapsedMs: 0, pct: 0 });

      const { exportCardsToPdf } = await import("@/lib/pdf");
      await exportCardsToPdf(photos, captions, transforms, {
        size: 2048,
        format,
        quality: Math.min(0.95, Math.max(0.5, quality / 100)),
        onProgress: (p) => setProg(p),
      });
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }, [photos, captions, transforms, format, quality]);

  return (
    <section className="space-y-3">
      {/* Cards header removed */}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p) => (
          <CardItem key={p.id} photo={p} />
        ))}
      </div>

      {/* Export controls — hidden when there are no cards */}
      {photos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="opacity-70">Format</span>
              <Select value={format} onValueChange={(v: "jpeg" | "png") => setFormat(v)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG (smaller)</SelectItem>
                  <SelectItem value="png">PNG (lossless)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {format === "jpeg" && (
              <div className="flex items-center gap-2">
                <span className="opacity-70">Quality</span>
                <input
                  type="range" min={50} max={95} step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
                <span className="tabular-nums">{quality}%</span>
              </div>
            )}
          </div>

          {(busy || prog) && (
            <>
              <Progress value={pct} className="h-2" />
              <div className="text-xs opacity-70">{status}</div>
            </>
          )}

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={onExportPdf} disabled={!photos.length || busy}>
              {busy ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
