// src/lib/pdf.ts
// All comments must be in English (project rule).

import { PDFDocument } from "pdf-lib";
import type { PhotoItem } from "@/lib/imageLoader";

export type ExportProgress = {
  done: number;        // pages rendered so far
  total: number;       // total pages
  elapsedMs: number;   // time since start
  etaMs?: number;      // estimated time remaining
  pct: number;         // 0..100
};

/** Load <img> from a URL (works with blob: URLs). */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/** Render one card (photo + caption bar) to PNG Blob via Canvas. */
async function renderCardPngBlob(
  photo: PhotoItem,
  caption: string,
  opts: {
    size?: number;
    bg?: string;
    captionBg?: string;
    textColor?: string;
  } = {}
): Promise<Blob> {
  const size = opts.size ?? 2048;
  const bg = opts.bg ?? "transparent";
  const captionBg = opts.captionBg ?? "rgba(255,255,255,0.82)";
  const textColor = opts.textColor ?? "#111";

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
  const scale = Math.max(size / img.width, size / img.height);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);
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
  const maxW = size - padX * 2;
  let text = caption;
  if (ctx.measureText(text).width > maxW) {
    while (text.length && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
    text += "…";
  }
  ctx.fillText(text, padX, size - barH / 2);

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
  );
  return blob;
}

/** Download bytes as a .pdf file. */
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
 * Build a PDF: one card per page, square pages.
 * Accepts onProgress callback for UI updates.
 */
export async function exportCardsToPdf(
  photos: PhotoItem[],
  captions: Record<string, string>,
  opts: { size?: number; onProgress?: (p: ExportProgress) => void } = {}
) {
  const size = opts.size ?? 2048;
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
    const pngBlob = await renderCardPngBlob(photo, cap, { size });

    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const img = await pdf.embedPng(pngBytes);

    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });

    tick(i + 1);

    // Yield to the UI thread to let React render progress.
    await new Promise((r) => setTimeout(r, 0));
  }

  const bytes = await pdf.save();
  downloadPdf(bytes);
}
