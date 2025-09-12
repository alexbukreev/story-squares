// src/components/PreviewDialog.tsx
// All comments must be in English (project rule).

import * as React from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PhotoItem } from "@/lib/imageLoader";
import type { Transform } from "@/store/useProjectStore";
import { renderCardExactPngUrl, exportCardPng } from "@/lib/exportImage";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo: PhotoItem;
  caption: string;
  transform: Transform;
  onEdit: () => void;
};

export default function PreviewDialog({
  open,
  onOpenChange,
  photo,
  caption,
  transform,
  onEdit,
}: Props) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let prev: string | null = null;
    let cancelled = false;

    if (!open) {
      if (prev) URL.revokeObjectURL(prev);
      setUrl(null);
      return;
    }

    setLoading(true);
    (async () => {
      const u = await renderCardExactPngUrl(photo, caption, {
        size: 2048,
        transform,
      });
      if (cancelled) {
        URL.revokeObjectURL(u);
        return;
      }
      if (prev) URL.revokeObjectURL(prev);
      setUrl(u);
      prev = u;
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (prev) URL.revokeObjectURL(prev);
    };
  }, [open, photo.url, caption, transform.scale, transform.tx, transform.ty]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          aria-describedby={undefined}
          className="
            max-w-[min(96vw,52rem)]
            max-h-[96vh]
            p-2
            overflow-hidden
          "
        >
            <DialogHeader className="shrink-0">
              <DialogTitle>Preview</DialogTitle>
              <DialogDescription className="sr-only">
                Full-size preview of the card. You can export PNG or switch to editing.
              </DialogDescription>
            </DialogHeader>
            <div className="relative grid place-items-center" style={{ minHeight: "60vh" }}>
              {url ? (
                  <img
                  src={url}
                  alt={photo.name}
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-md"/>
            ) : (
                <div className="h-24" />
            )}

            {/* Dim + spinner (как на карточке) */}
            <div
                className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity ${
                loading ? "opacity-100" : "opacity-0"
                } bg-background/80 backdrop-blur-[2px]`}
                aria-hidden={!loading}
            >
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground/40 border-t-transparent" />
            </div>
            </div>
            <DialogFooter className="mt-2 gap-2">
              <Button
                  variant="secondary"
                  onClick={() => {
                  onOpenChange(false); // закрываем просмотр
                  onEdit();            // открываем редактор
                  }}
              >
                  Edit
              </Button>
              <Button
                  onClick={() =>
                  exportCardPng(photo, caption, { size: 2048, transform })
                  }
              >
                  Save PNG
              </Button>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
