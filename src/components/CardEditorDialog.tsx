// src/components/CardEditorDialog.tsx
// All comments must be in English (project rule).

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { PhotoItem } from "@/lib/imageLoader";
import { useProjectStore, DEFAULT_TRANSFORM } from "@/store/useProjectStore";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo: PhotoItem;
};

export default function CardEditorDialog({ open, onOpenChange, photo }: Props) {
  const captions = useProjectStore((s) => s.captions);
  const setCaption = useProjectStore((s) => s.setCaption);

  const t = useProjectStore((s) => s.transforms[photo.id] ?? DEFAULT_TRANSFORM);
  const setTransform = useProjectStore((s) => s.setTransform);
  const resetTransform = useProjectStore((s) => s.resetTransform);

  // Local caption state (commit on Save)
  const initialCap = captions[photo.id] ?? photo.name.replace(/\.[^.]+$/, "");
  const [cap, setCap] = React.useState(initialCap);
  React.useEffect(() => {
    setCap(captions[photo.id] ?? photo.name.replace(/\.[^.]+$/, ""));
  }, [captions, photo.id, photo.name]);

  const onSave = () => {
    setCaption(photo.id, cap);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="
          max-w-[min(92vw,52rem)]
          max-h-[92vh]
          p-4
          overflow-hidden
          flex flex-col
        "
      >
        <DialogHeader className="shrink-0">
            <DialogTitle>Edit card</DialogTitle>
            <DialogDescription className="sr-only">
                Adjust zoom and position of the photo and edit the caption.
            </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">
          <div className="grid gap-4">
            {/* Square preview that never exceeds viewport */}
            <div
              className="
                mx-auto w-full
                max-w-[min(86vw,70vh)]
                aspect-square
                rounded-xl border bg-muted/20 overflow-hidden relative
              "
            >
              {/* Image with transform */}
              <img
                src={photo.url}
                alt={photo.name}
                className="h-full w-full object-cover"
                style={{
                  transform: `translate(${t.tx}%, ${t.ty}%) scale(${t.scale})`,
                  transformOrigin: "center",
                }}
              />

              {/* Caption editor on image – plain input */}
                <div className="absolute inset-x-0 bottom-0">
                    <div className="relative bg-background/80 backdrop-blur-sm px-2 py-1">
                        <input
                        dir="ltr"
                        value={cap}
                        onChange={(e) => setCap(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                            e.preventDefault();
                            onSave();
                            }
                        }}
                        className="w-full bg-transparent border-0 outline-none focus-visible:ring-0 text-xs"
                        placeholder="Type caption…"
                        aria-label="Caption"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        />
                    </div>
                </div>

            </div>

            {/* Controls */}
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Label>Zoom</Label>
                  <span className="tabular-nums opacity-70">{t.scale.toFixed(2)}×</span>
                </div>
                <Slider
                  value={[t.scale]}
                  min={1}
                  max={3}
                  step={0.01}
                  onValueChange={([v]) => setTransform(photo.id, { scale: v })}
                />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Label>Horizontal</Label>
                  <span className="tabular-nums opacity-70">{t.tx.toFixed(0)}%</span>
                </div>
                <Slider
                  value={[t.tx]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setTransform(photo.id, { tx: v })}
                />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Label>Vertical</Label>
                  <span className="tabular-nums opacity-70">{t.ty.toFixed(0)}%</span>
                </div>
                <Slider
                  value={[t.ty]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setTransform(photo.id, { ty: v })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => resetTransform(photo.id)}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
