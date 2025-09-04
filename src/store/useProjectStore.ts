// src/store/useProjectStore.ts
// All comments must be in English (project rule).

import { create } from "zustand";
import { revokePhotoItems, type PhotoItem } from "@/lib/imageLoader";

type ProjectStore = {
  photos: PhotoItem[];
  max: number;

  templateId: string;              // <-- NEW
  setTemplateId: (id: string) => void; // <-- NEW

  add: (items: PhotoItem[]) => void;
  clear: () => void;
  remove: (id: string) => void;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  photos: [],
  max: 36,

  templateId: "sq-1",                // default preset
  setTemplateId: (id) => set({ templateId: id }),

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
    set({ photos: [] });
  },

  remove: (id) => {
    const { photos } = get();
    const idx = photos.findIndex((p) => p.id === id);
    if (idx === -1) return;
    revokePhotoItems([photos[idx]]);
    set({ photos: photos.filter((p) => p.id !== id) });
  },
}));
