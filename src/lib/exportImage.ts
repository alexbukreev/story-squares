// src/lib/exportImage.ts
// All comments must be in English (project rule).

import type { PhotoItem } from "@/lib/imageLoader";
import { type Transform, DEFAULT_TRANSFORM } from "@/store/useProjectStore";

/** Load <img> from a URL (works with blob: URLs too). */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

export function sanitizeFilename(name: string, fallback = "card") {
  const s = name.replace(/[^a-z0-9_\-]+/gi, "_").replace(/^_+|_+$/g, "");
  return (s || fallback).slice(0, 100);
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Render preview that is a downscaled copy of the *exact* 2048 PNG.
 *  Ensures preview is visually identical to export, but lightweight. */
export async function renderCardExactPreviewUrl(
  photo: PhotoItem,
  caption: string,
  opts: {
    size?: number;            // target preview size (square)
    baseSize?: number;        // source render size, must match export (default 2048)
    bg?: string;
    captionBg?: string;
    textColor?: string;
    transform?: Transform;
  } = {}
): Promise<string> {
  const targetSize = opts.size ?? 768;      // лёгкий превьюшный размер
  const baseSize   = opts.baseSize ?? 2048; // как в экспорт

  // 1) Рендерим "большой" PNG абсолютно тем же кодом
  const bigUrl = await renderCardExactPngUrl(photo, caption, {
    size: baseSize,
    bg: opts.bg,
    captionBg: opts.captionBg,
    textColor: opts.textColor,
    transform: opts.transform,
  });

  try {
    // 2) Масштабируем в маленький PNG для превью
    const img = await loadImage(bigUrl);
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetSize, targetSize);

    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
    );
    return URL.createObjectURL(blob);
  } finally {
    // не держим в памяти 2048-версию
    URL.revokeObjectURL(bigUrl);
  }
}


/** Ellipsize text to fit into maxWidth. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
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
        // Hard-wrap very long words by characters
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

// --- Shared caption metrics (single source of truth) ---
const CAP_BAR_FRAC = 0.06;     // bar min height = 6% of side
const CAP_MIN_BAR  = 72;       // absolute minimum in px (for small sizes)
const CAP_PAD_FRAC = 0.22;     // horizontal/vertical padding inside bar
const CAP_FONT_FRAC = 0.34;    // font size relative to bar height

function captionMetrics(size: number) {
  const minBarH   = Math.max(CAP_MIN_BAR, Math.round(size * CAP_BAR_FRAC));
  const pad       = Math.round(minBarH * CAP_PAD_FRAC);
  const fontSize  = Math.round(minBarH * CAP_FONT_FRAC);
  const lineHeight = Math.round(fontSize * 1.25);
  return { minBarH, pad, fontSize, lineHeight };
}

/**
 * Export single card as PNG using Canvas.
 * `transform` matches CSS preview: translate(% of card) then scale().
 */
export async function exportCardPng(
  photo: PhotoItem,
  caption: string,
  opts: {
    size?: number;
    bg?: string;
    captionBg?: string;
    textColor?: string;
    transform?: Transform;
  } = {}
) {
  const size = opts.size ?? 2048;
  const bg = opts.bg ?? "transparent";
  const captionBg = opts.captionBg ?? "rgba(255,255,255,0.82)";
  const textColor = opts.textColor ?? "#111";
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

  // Image with object-cover + transform (translate% then scale)
  const img = await loadImage(photo.url);
  const base = Math.max(size / img.width, size / img.height);
  const scale = base * t.scale;
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((size - dw) / 2 + (t.tx / 100) * size);
  const dy = Math.round((size - dh) / 2 + (t.ty / 100) * size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);

  // --- Caption ---
  const { minBarH, pad, fontSize, lineHeight } = captionMetrics(size);

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

      const text = ellipsize(ctx, caption, maxTextWidth);
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      ctx.fillText(text, pad, size - barH / 2);
    } else {
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

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
  );
  downloadBlob(blob, `${sanitizeFilename(caption || "card")}.png`);
}

/** Render *exact* PNG (same math as exportCardPng) and return an objectURL for preview. */
export async function renderCardExactPngUrl(
  photo: PhotoItem,
  caption: string,
  opts: {
    size?: number;
    bg?: string;
    captionBg?: string;
    textColor?: string;
    transform?: Transform;
  } = {}
): Promise<string> {
  const size = opts.size ?? 2048;
  const bg = opts.bg ?? "transparent";
  const captionBg = opts.captionBg ?? "rgba(255,255,255,0.82)";
  const textColor = opts.textColor ?? "#111";
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

  // image (object-cover) + transform
  const img = await (async function loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = (e) => reject(e);
      im.src = url;
    });
  })(photo.url);

  const base = Math.max(size / img.width, size / img.height);
  const scale = base * t.scale;
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((size - dw) / 2 + (t.tx / 100) * size);
  const dy = Math.round((size - dh) / 2 + (t.ty / 100) * size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);

  // caption — must match exportCardPng
  const { minBarH, pad, fontSize, lineHeight } = captionMetrics(size);

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

      const text = ellipsize(ctx, caption, maxTextWidth);
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      ctx.fillText(text, pad, size - barH / 2);
    } else {
      // wrapText уже есть в этом файле — используем его
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

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
  );
  return URL.createObjectURL(blob);
}

/** Render a card snapshot and return an objectURL (for preview). */
export async function renderCardPreviewUrl(
  photo: PhotoItem,
  caption: string,
  opts: {
    size?: number;
    bg?: string;
    captionBg?: string;
    textColor?: string;
    transform?: Transform;
  } = {}
): Promise<string> {
  const size = opts.size ?? 1024;
  const bg = opts.bg ?? "transparent";
  const captionBg = opts.captionBg ?? "rgba(255,255,255,0.82)";
  const textColor = opts.textColor ?? "#111";
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

  // image (object-cover) + transform
  const img = await loadImage(photo.url);
  const base = Math.max(size / img.width, size / img.height);
  const scale = base * t.scale;
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((size - dw) / 2 + (t.tx / 100) * size);
  const dy = Math.round((size - dh) / 2 + (t.ty / 100) * size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);

  const { minBarH, pad, fontSize, lineHeight } = captionMetrics(size);

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

      const text = ellipsize(ctx, caption, maxTextWidth);
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      ctx.fillText(text, pad, size - barH / 2);
    } else {
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

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
  );
  return URL.createObjectURL(blob);
}
