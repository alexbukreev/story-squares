// src/store/useProjectStore.ts
// All comments must be in English (project rule).

import { create } from "zustand";
import { revokePhotoItems, type PhotoItem } from "@/lib/imageLoader";

type ProjectStore = {
  photos: PhotoItem[];
  max: number;

  captions: Record<string, string>;
  setCaption: (id: string, text: string) => void;

  add: (items: PhotoItem[]) => void;
  clear: () => void;
  remove: (id: string) => void;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  photos: [],
  max: 36,

  captions: {},
  setCaption: (id, text) =>
    set((s) => ({
      captions: text.trim()
        ? { ...s.captions, [id]: text }
        : (() => { const { [id]:_, ...rest } = s.captions; return rest; })(),
    })),

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
    set({ photos: [], captions: {} });
  },

  remove: (id) => {
    const { photos, captions } = get();
    const idx = photos.findIndex((p) => p.id === id);
    if (idx === -1) return;
    revokePhotoItems([photos[idx]]);
    const { [id]: _, ...rest } = captions;
    set({ photos: photos.filter((p) => p.id !== id), captions: rest });
  },
}));
