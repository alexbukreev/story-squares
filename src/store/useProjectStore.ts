// src/store/useProjectStore.ts
// All comments must be in English (project rule).

import { create } from "zustand";
import { revokePhotoItems, type PhotoItem } from "@/lib/imageLoader";

type ProjectStore = {
  photos: PhotoItem[];
  max: number;
  add: (items: PhotoItem[]) => void;
  clear: () => void;
  remove: (id: string) => void;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  photos: [],
  max: 36,

  // Append photos until max capacity.
  add: (items) => {
    if (!items?.length) return;
    const { photos, max } = get();
    const remaining = Math.max(0, max - photos.length);
    if (!remaining) return;
    const slice = items.slice(0, remaining);
    set({ photos: [...photos, ...slice] });
  },

  // Clear all photos and revoke object URLs.
  clear: () => {
    const old = get().photos;
    if (old.length) revokePhotoItems(old);
    set({ photos: [] });
  },

  // Remove single photo by id and revoke its URL.
  remove: (id) => {
    const { photos } = get();
    const idx = photos.findIndex((p) => p.id === id);
    if (idx === -1) return;
    revokePhotoItems([photos[idx]]);
    set({ photos: photos.filter((p) => p.id !== id) });
  },
}));
