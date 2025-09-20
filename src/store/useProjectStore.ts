// src/store/useProjectStore.ts
// All comments must be in English (project rule).

import { create } from "zustand";
import { revokePhotoItems, type PhotoItem } from "@/lib/imageLoader";
import { MAX_CARDS } from "@/config";

export type Transform = {
  /** Scale factor for the photo inside the square card. */
  scale: number;  // typical range: 1..3
  /** Translate X and Y in percent of card size (-100..100). */
  tx: number;     // -100..100 (%)
  ty: number;     // -100..100 (%)
};

export const DEFAULT_TRANSFORM: Transform = { scale: 1, tx: 0, ty: 0 };

type ProjectStore = {
  photos: PhotoItem[];
  max: number;

  captions: Record<string, string>;
  transforms: Record<string, Transform>;

  setCaption: (id: string, text: string) => void;

  /** Patch transform (partial) with clamping. */
  setTransform: (id: string, patch: Partial<Transform>) => void;
  /** Remove custom transform for id (fallback to defaults). */
  resetTransform: (id: string) => void;

  add: (items: PhotoItem[]) => void;
  clear: () => void;
  remove: (id: string) => void;
};

// small helpers
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const useProjectStore = create<ProjectStore>((set, get) => ({
  photos: [],
  max: MAX_CARDS,

  captions: {},
  transforms: {},

  setCaption: (id, text) =>
    set((s) => ({
      captions: text.trim()
        ? { ...s.captions, [id]: text }
        : (() => {
            const { [id]: _, ...rest } = s.captions;
            return rest;
          })(),
    })),

  setTransform: (id, patch) =>
    set((s) => {
      const prev = s.transforms[id] ?? DEFAULT_TRANSFORM;
      const next: Transform = {
        scale: clamp(patch.scale ?? prev.scale, 0.5, 4),
        tx: clamp(patch.tx ?? prev.tx, -100, 100),
        ty: clamp(patch.ty ?? prev.ty, -100, 100),
      };
      return { transforms: { ...s.transforms, [id]: next } };
    }),

  resetTransform: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.transforms;
      return { transforms: rest };
    }),

  add: (items) => {
    if (!items?.length) return;
    const { photos, max } = get();
    const remaining = Math.max(0, max - photos.length);
    if (!remaining) return;
    const slice = items.slice(0, remaining);
    set({ photos: [...photos, ...slice] });
  },

  clear: () => {
    const old = get().photos;
    if (old.length) revokePhotoItems(old);
    set({ photos: [], captions: {}, transforms: {} });
  },

  remove: (id) => {
    const { photos, captions, transforms } = get();
    const idx = photos.findIndex((p) => p.id === id);
    if (idx === -1) return;
    revokePhotoItems([photos[idx]]);
    const { [id]: _c, ...captRest } = captions;
    const { [id]: _t, ...trRest } = transforms;
    set({
      photos: photos.filter((p) => p.id !== id),
      captions: captRest,
      transforms: trRest,
    });
  },
}));
