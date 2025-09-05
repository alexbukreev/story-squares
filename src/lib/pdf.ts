// src/lib/pdf.ts
// All comments must be in English (project rule).

import { PDFDocument } from "pdf-lib";
import type { PhotoItem } from "@/lib/imageLoader";
import { type Transform, DEFAULT_TRANSFORM } from "@/store/useProjectStore";

export type ExportProgress = { done: number; total: number; elapsedMs: number; etaMs?: number; pct: number };

type RenderOpts = {
  size?: number;
  format?: "jpeg" | "png";
  quality?: number;
  bg?: string;
  captionBg?: string;
  textColor?: string;
  transform?: Transform; // NEW: per-card transform
};

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

async function renderCardBytes(
  photo: PhotoItem,
  caption: string,
  opts: RenderOpts = {}
): Promise<{ bytes: Uint8Array; mime: "image/png" | "image/jpeg"; width: number; height: number }> {
  const size = opts.size ?? 2048;
  const bg = opts.bg ?? "transparent";
  const captionBg = opts.captionBg ?? "rgba(255,255,255,0.82)";
  const textColor = opts.textColor ?? "#111";
  const format = opts.format ?? "jpeg";
  const quality = opts.quality ?? 0.85;
  const t = opts.transform ?? DEFAULT_TRANSFORM;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }

  const img = await loadImage(photo.url);
  const base = Math.max(size / img.width, size / img.height);
  const scale = base * t.scale;
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((size - dw) / 2 + (t.tx / 100) * size);
  const dy = Math.round((size - dh) / 2 + (t.ty / 100) * size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);

  const barH = Math.max(96, Math.round(size * 0.12));
  ctx.fillStyle = captionBg;
  ctx.fillRect(0, size - barH, size, barH);

  const padX = Math.round(barH * 0.2);
  const fontSize = Math.round(barH * 0.42);
  ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  let text = caption;
  const maxW = size - padX * 2;
  if (ctx.measureText(text).width > maxW) {
    while (text.length && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
    text += "…";
  }
  ctx.fillText(text, padX, size - barH / 2);

  const mime = format === "png" ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), mime, mime === "image/jpeg" ? quality : undefined)
  );

  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime, width: size, height: size };
}

function downloadPdf(bytes: Uint8Array, filename = "story-squares.pdf") {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/**
 * Build PDF with one square page per card.
 * Now accepts `transforms` map to mirror preview transforms.
 */
export async function exportCardsToPdf(
  photos: PhotoItem[],
  captions: Record<string, string>,
  transforms: Record<string, Transform>,
  opts: RenderOpts & { onProgress?: (p: ExportProgress) => void } = {}
) {
  const size = opts.size ?? 2048;
  const format = opts.format ?? "jpeg";
  const quality = opts.quality ?? 0.85;
  const onProgress = opts.onProgress;

  const pdf = await PDFDocument.create();
  const total = photos.length;
  const t0 = performance.now();

  const tick = (done: number) => {
    if (!onProgress) return;
    const elapsedMs = performance.now() - t0;
    const pct = Math.round((done / total) * 100);
    const etaMs = done > 0 ? (elapsedMs / done) * (total - done) : undefined;
    onProgress({ done, total, elapsedMs, etaMs, pct });
  };

  tick(0);

  for (let i = 0; i < total; i++) {
    const photo = photos[i];
    const cap = captions[photo.id] ?? photo.name.replace(/\.[^.]+$/, "");
    const tr = transforms[photo.id] ?? DEFAULT_TRANSFORM;

    const { bytes, mime, width, height } = await renderCardBytes(photo, cap, {
        size,
        format,
        quality,
        transform: tr,
        bg: opts.bg,
        captionBg: opts.captionBg,
        textColor: opts.textColor,
      });      

    const img = mime === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });

    tick(i + 1);
    await new Promise((r) => setTimeout(r, 0));
  }

  const out = await pdf.save();
  downloadPdf(out);
}
