// src/features/templates/index.ts
// All comments must be in English (project rule).

export type Slot = {
    id: string;
    x: number; y: number; // 0..1 (percent of width/height)
    w: number; h: number; // 0..1
    mask?: 'rect' | 'rounded' | 'circle';
  };
  
  export type TemplateDef = {
    id: string;
    name: string;
    size: { w: number; h: number }; // nominal pixel size for render
    slots: Slot[];
  };
  
  const sq1: TemplateDef = {
    id: 'sq-1',
    name: 'Square 1 (1×1)',
    size: { w: 2048, h: 2048 },
    slots: [{ id: 'a', x: 0, y: 0, w: 1, h: 1, mask: 'rect' }],
  };
  
  const sq4: TemplateDef = {
    id: 'sq-4',
    name: 'Square 4 (2×2)',
    size: { w: 2048, h: 2048 },
    slots: [
      { id: 'a', x: 0,   y: 0,   w: 0.5, h: 0.5 },
      { id: 'b', x: 0.5, y: 0,   w: 0.5, h: 0.5 },
      { id: 'c', x: 0,   y: 0.5, w: 0.5, h: 0.5 },
      { id: 'd', x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  };
  
  const sq9: TemplateDef = {
    id: 'sq-9',
    name: 'Square 9 (3×3)',
    size: { w: 2048, h: 2048 },
    slots: Array.from({ length: 9 }, (_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      return { id: String.fromCharCode(97 + i), x: col / 3, y: row / 3, w: 1 / 3, h: 1 / 3 };
    }),
  };
  
  const REGISTRY: Record<string, TemplateDef> = {
    [sq1.id]: sq1, [sq4.id]: sq4, [sq9.id]: sq9,
  };
  
  export function getTemplate(id: string): TemplateDef {
    return REGISTRY[id] ?? sq1;
  }
  
  export function listTemplates(): TemplateDef[] {
    return [sq1, sq4, sq9];
  }
  