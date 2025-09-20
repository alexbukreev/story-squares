// src/components/CardsPreview.tsx
// All comments must be in English (project rule).

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useProjectStore } from "@/store/useProjectStore";
import CardItem from "@/components/CardItem";
import { CARD_EXPORT_SIZE, PDF_JPEG_QUALITY } from "@/config";

type ExportProgress = { done: number; total: number; elapsedMs: number; etaMs?: number; pct: number };

function fmtMs(ms: number) {
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

export default function CardsPreview() {
  const photos     = useProjectStore((s) => s.photos);
  const captions   = useProjectStore((s) => s.captions);
  const transforms = useProjectStore((s) => s.transforms);

  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<ExportProgress | null>(null);
  const inFlight = useRef(false);

  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [quality, setQuality] = useState(PDF_JPEG_QUALITY * 100); // 50..95 (for jpeg)

  const pct = prog?.pct ?? 0;
  const status = useMemo(() => {
    if (!prog) return "";
    const left = prog.etaMs ?? 0;
    return `Rendering ${prog.done}/${prog.total} • ${pct}% • elapsed ${fmtMs(prog.elapsedMs)}${
      prog.done < prog.total ? ` • ETA ${fmtMs(left)}` : ""
    }`;
  }, [prog, pct]);

  // Auto-hide status right after finishing.
  useEffect(() => {
    if (prog && prog.done >= prog.total) {
      setProg(null);
    }
  }, [prog]);

  const onExportPdf = useCallback(async () => {
    if (!photos.length || inFlight.current) return;
    inFlight.current = true;
    try {
      setBusy(true);
      setProg({ done: 0, total: photos.length, elapsedMs: 0, pct: 0 });

      const { exportCardsToPdf } = await import("@/lib/pdf");
      await exportCardsToPdf(photos, captions, transforms, {
        size: CARD_EXPORT_SIZE,
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
      {/* Grid of card previews */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p) => (
          <CardItem key={p.id} photo={p} />
        ))}
      </div>

      {/* Export panel — show only when there are photos */}
      {photos.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 text-sm font-medium">Export the collection to PDF</div>

          {/* Status ABOVE controls; hidden when finished */}
          {prog && (
            <>
              <Progress value={pct} className="mb-1 h-2" />
              <div className="mb-3 text-xs opacity-70">{status}</div>
            </>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="opacity-70">Format</span>
              <Select value={format} onValueChange={(v: "jpeg" | "png") => setFormat(v)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG (small)</SelectItem>
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

            <div className="grow" />

            <Button
              type="button"
              size="sm"
              onClick={onExportPdf}
              disabled={!photos.length || busy}
            >
              {busy ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
