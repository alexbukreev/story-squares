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

  // Caption bar + text (multiline, same scale as editor/PNG)
  const CAP_BAR_FRAC = 0.06;     // 6% of side for one-line baseline
  const CAP_FONT_FRAC = 0.34;    // font size relative to bar height
  const minBarH   = Math.max(72, Math.round(size * CAP_BAR_FRAC));
  const pad       = Math.round(minBarH * 0.22);
  const fontSize  = Math.round(minBarH * CAP_FONT_FRAC);
  const lineHeight = Math.round(fontSize * 1.25);

  if (caption && caption.trim()) {
    ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";

    const maxTextWidth = size - pad * 2;
    const needsWrap = caption.includes("\n") || ctx.measureText(caption).width > maxTextWidth;

    if (!needsWrap) {
      const barH = minBarH;
      ctx.fillStyle = captionBg;
      ctx.fillRect(0, size - barH, size, barH);

      // single-line with ellipsis
      let text = caption;
      if (ctx.measureText(text).width > maxTextWidth) {
        while (text.length && ctx.measureText(text + "…").width > maxTextWidth) text = text.slice(0, -1);
        text += "…";
      }
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      ctx.fillText(text, pad, size - barH / 2);
    } else {
      // multiline
      const lines = wrapText(ctx, caption, maxTextWidth);
      const textH = Math.max(lineHeight, lines.length * lineHeight);
      const barH = Math.max(minBarH, pad + textH + pad);

      ctx.fillStyle = captionBg;
      ctx.fillRect(0, size - barH, size, barH);

      ctx.fillStyle = textColor;
      let y = size - barH + pad;
      for (const line of lines) {
        ctx.fillText(line, pad, y, maxTextWidth);
        y += lineHeight;
      }
    }
  }


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

/** Word-wrapping helper (respects explicit \n). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paras = text.replace(/\r\n?/g, "\n").split("\n");
  const lines: string[] = [];
  for (const p of paras) {
    const words = p.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width <= maxWidth) {
        cur = test;
      } else {
        if (cur) lines.push(cur);
        if (ctx.measureText(w).width > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            const t = chunk + ch;
            if (ctx.measureText(t).width <= maxWidth) chunk = t;
            else { lines.push(chunk); chunk = ch; }
          }
          cur = chunk;
        } else {
          cur = w;
        }
      }
    }
    lines.push(cur);
  }
  return lines;
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
    const cap = (captions[photo.id] ?? "").trim();
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
