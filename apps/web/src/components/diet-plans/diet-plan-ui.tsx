import { MEAL_TYPE_LABELS, type NutrientTotals } from "@fit-sihirbaz/shared";

export { MEAL_TYPE_LABELS };

// Toplamlar float hesabından geldiği için (ör. 617.6800000000001) gösterimde en fazla 1 ondalığa yuvarlanır.
function formatAmount(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function TotalsBadge({ totals }: { totals: NutrientTotals }) {
  return (
    <span className="text-xs text-muted-foreground">
      {formatAmount(totals.calories)} kcal · P {formatAmount(totals.protein)}g · K {formatAmount(totals.carbs)}g · Y{" "}
      {formatAmount(totals.fat)}g
    </span>
  );
}
