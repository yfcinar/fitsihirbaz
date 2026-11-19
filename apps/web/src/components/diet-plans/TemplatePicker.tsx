"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  clientId: string;
  onApplied: (planId: string) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Diyetisyenin kayıtlı şablonlarından birini seçip danışan için yeni taslak plan başlatır.
export function TemplatePicker({ clientId, onApplied }: Props) {
  const utils = trpc.useUtils();
  const templatesQuery = trpc.dietPlans.listTemplates.useQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [targetCalories, setTargetCalories] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const applyMutation = trpc.dietPlans.applyTemplate.useMutation({
    onSuccess: (result) => {
      if (result.skippedItems > 0) {
        // Atlanan kalem varsa diyetisyen planı açmadan önce bilgilendirilir.
        window.alert(`${result.skippedItems} besin/tarif artık mevcut olmadığı için şablondan atlandı. Planı kontrol edin.`);
      }
      onApplied(result.plan.id);
    },
  });
  const deleteMutation = trpc.dietPlans.deleteTemplate.useMutation({
    onSuccess: () => {
      setNotice("Şablon silindi.");
      utils.dietPlans.listTemplates.invalidate();
    },
  });

  const templates = templatesQuery.data ?? [];
  if (templates.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-2 text-sm font-medium text-foreground">Şablondan başla</h2>
      <ul className="divide-y rounded-md border">
        {templates.map((template) => (
          <li key={template.id} className="px-4 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="font-medium text-foreground">{template.name}</span>{" "}
                <span className="text-muted-foreground">
                  · {template.dayCount} gün · {template.itemCount} besin
                  {template.targetCalories ? ` · ${template.targetCalories} kcal` : ""}
                </span>
              </span>
              <span className="flex gap-3">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    setOpenId(openId === template.id ? null : template.id);
                    setTitle(template.name);
                    setTargetCalories(template.targetCalories ? String(template.targetCalories) : "");
                  }}
                >
                  Bu şablonla başla
                </button>
                <button
                  type="button"
                  className="text-destructive hover:underline"
                  onClick={() => {
                    if (window.confirm(`"${template.name}" şablonu silinsin mi? Daha önce üretilen planlar etkilenmez.`)) {
                      deleteMutation.mutate({ templateId: template.id });
                    }
                  }}
                >
                  Sil
                </button>
              </span>
            </div>
            {template.description && <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>}

            {openId === template.id && (
              <form
                className="mt-3 flex flex-wrap items-end gap-3 rounded-md bg-muted/40 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  applyMutation.mutate({
                    templateId: template.id,
                    clientId,
                    title,
                    startDate,
                    targetCalories: targetCalories ? Number(targetCalories) : undefined,
                  });
                }}
              >
                <div className="space-y-1">
                  <Label className="text-xs">Plan başlığı</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} className="w-56" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Başlangıç</Label>
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hedef kalori</Label>
                  <Input
                    type="number"
                    min="1"
                    value={targetCalories}
                    onChange={(event) => setTargetCalories(event.target.value)}
                    className="w-28"
                  />
                </div>
                <Button type="submit" size="sm" disabled={applyMutation.isLoading || !title.trim() || !startDate}>
                  {applyMutation.isLoading ? "Oluşturuluyor..." : "Taslak Oluştur"}
                </Button>
                {applyMutation.error && <p className="w-full text-sm text-destructive">{applyMutation.error.message}</p>}
              </form>
            )}
          </li>
        ))}
      </ul>
      {notice && <p className="mt-1 text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}
