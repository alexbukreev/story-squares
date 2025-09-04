// src/lib/exportImage.ts
// All comments must be in English (project rule).

import type { PhotoItem } from "@/lib/imageLoader";

/** Load <img> from a URL (works with blob: URLs too). */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // No crossOrigin needed for blob: URLs.
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/** Sanitize string to be used as a file name. */
export function sanitizeFilename(name: string, fallback = "card") {
  const s = name.replace(/[^a-z0-9_\-]+/gi, "_").replace(/^_+|_+$/g, "");
  return (s || fallback).slice(0, 100);
}

/** Download a Blob as a file. */
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

/** Ellipsize text to fit into maxWidth. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/**
 * Export single card as PNG using Canvas (no html-to-image).
 * - size: output square size in pixels (default 2048)
 * - bg: background color under the photo (default transparent)
 * - captionBg: caption bar color (default rgba(255,255,255,0.82))
 * - textColor: caption text color (default #111)
 */
export async function exportCardPng(
  photo: PhotoItem,
  caption: string,
  opts: {
    size?: number;
    bg?: string;
    captionBg?: string;
    textColor?: string;
  } = {}
) {
  const size = opts.size ?? 2048;
  const bg = opts.bg ?? "transparent";
  const captionBg = opts.captionBg ?? "rgba(255,255,255,0.82)";
  const textColor = opts.textColor ?? "#111";

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // Background
  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }

  // Load image (from object URL).
  const img = await loadImage(photo.url);

  // Draw image with object-fit: cover
  const scale = Math.max(size / img.width, size / img.height);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);

  // Caption bar
  const barH = Math.max(96, Math.round(size * 0.12));
  ctx.fillStyle = captionBg;
  ctx.fillRect(0, size - barH, size, barH);

  // Caption text
  const padX = Math.round(barH * 0.2);
  const fontSize = Math.round(barH * 0.42);
  ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  const maxTextW = size - padX * 2;
  const text = ellipsize(ctx, caption, maxTextW);
  ctx.fillText(text, padX, size - barH / 2);

  // Blob → download
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
  );
  downloadBlob(blob, `${sanitizeFilename(caption || "card")}.png`);
}
