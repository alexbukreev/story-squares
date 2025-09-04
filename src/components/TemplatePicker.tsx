// src/components/TemplatePicker.tsx
// All comments must be in English (project rule).

import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProjectStore } from "@/store/useProjectStore";

const TEMPLATES = [
  { id: "sq-1", name: "Square 1 (1×1)" },
  { id: "sq-4", name: "Square 4 (2×2)" },
  { id: "sq-9", name: "Square 9 (3×3)" },
];

export default function TemplatePicker() {
  const templateId = useProjectStore((s) => s.templateId);
  const setTemplateId = useProjectStore((s) => s.setTemplateId);

  return (
    <section className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm opacity-80">Template</div>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choose template" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
    </section>
  );
}
