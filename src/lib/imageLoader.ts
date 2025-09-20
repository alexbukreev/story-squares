// src/lib/imageLoader.ts
// All comments must be in English (project rule).

export type PhotoItem = {
    id: string;
    url: string;         // object URL for preview
    name: string;
    size: number;        // bytes
    type: string;        // MIME
  };
  
  const IMAGE_MIME = /^(image\/(jpeg|png|webp|gif|avif|bmp|tiff))$/i;
  
  export function isImageFile(file: File): boolean {
    return IMAGE_MIME.test(file.type);
  }
  
  /** Convert File[] to PhotoItem[] with object URLs. Enforces max count. */
  export function filesToPhotoItems(files: File[], max = 36): PhotoItem[] {
    const items: PhotoItem[] = [];
    for (const file of files) {
      if (!isImageFile(file)) continue;
      if (items.length >= max) break;
      items.push({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
    return items;
  }
  
  /** Revoke object URLs to prevent memory leaks. */
  export function revokePhotoItems(items: PhotoItem[]) {
    for (const it of items) {
      try { URL.revokeObjectURL(it.url); } catch { /* noop */ }
    }
  }
  