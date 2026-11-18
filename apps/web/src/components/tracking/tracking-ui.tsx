import type { MealLogStatus, NutrientSummary } from "@fit-sihirbaz/shared";
import { Badge } from "@/components/ui/badge";

export const STATUS_LABELS: Record<MealLogStatus, string> = {
  EATEN: "Yedim",
  PARTIAL: "Kısmen",
  SKIPPED: "Yemedim",
};

export const UNIT_LABELS = { GRAM: "g", ML: "ml", PORTION: "porsiyon", PIECE: "adet" } as const;

// Tarayıcının yerel saatine göre YYYY-MM-DD (toISOString UTC verdiği için gece yarısına yakın
// saatlerde bir gün kayabilir).
export function localDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("sv-SE");
}

export function shiftDateString(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

export function formatDateTr(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function StatusBadge({ status }: { status: MealLogStatus | null }) {
  if (!status) {
    return <Badge variant="outline">İşaretlenmedi</Badge>;
  }
  const variant = status === "EATEN" ? "success" : status === "PARTIAL" ? "warning" : "destructive";
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

export function ConsumedSummary({ consumed, waterTotalMl }: { consumed: NutrientSummary; waterTotalMl: number }) {
  return (
    <p className="text-sm text-muted-foreground">
      {consumed.calories} kcal · P {consumed.protein}g · K {consumed.carbs}g · Y {consumed.fat}g · Su{" "}
      {(waterTotalMl / 1000).toFixed(2)} L
    </p>
  );
}
