"use client";

import { useState } from "react";
import { MEAL_TYPE_LABELS, type TrackingDay } from "@fit-sihirbaz/shared";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConsumedSummary, formatDateTr, StatusBadge, UNIT_LABELS } from "./tracking-ui";

// Diyetisyenin bir danışanın seçili gününü salt-okunur gördüğü ve yorum bırakabildiği görünüm.
export function TrackingDayView({ clientId, day }: { clientId: string; day: TrackingDay }) {
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commentMutation = trpc.tracking.addComment.useMutation({
    onSuccess: () => {
      setBody("");
      setError(null);
      utils.tracking.getDay.invalidate({ clientId, date: day.date });
      utils.tracking.getRange.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  const itemsByMeal = new Map<string, typeof day.plannedItems>();
  for (const item of day.plannedItems) {
    const key = item.mealType;
    itemsByMeal.set(key, [...(itemsByMeal.get(key) ?? []), item]);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium capitalize text-foreground">{formatDateTr(day.date)}</h3>
        <ConsumedSummary consumed={day.consumed} waterTotalMl={day.waterTotalMl} />
      </div>

      {day.plannedItems.length === 0 && (
        <EmptyState title="Bu gün için planlanmış öğün yok" description="Aktif bir planın bu gününe ait kalem bulunmuyor." />
      )}

      {[...itemsByMeal.entries()].map(([mealType, items]) => (
        <div key={mealType} className="mb-3 rounded-md bg-muted/50 p-3">
          <p className="mb-1 text-sm font-medium text-foreground">
            {MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS]}
          </p>
          <ul className="space-y-1 text-sm">
            {items.map((item) => (
              <li key={item.dietPlanMealItemId} className="flex items-center justify-between gap-2">
                <span>
                  {item.name} — {item.quantity} {UNIT_LABELS[item.unit]}
                  {item.note && <span className="ml-2 text-muted-foreground">“{item.note}”</span>}
                </span>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {day.extraFoods.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-sm font-medium text-foreground">Plan dışı yenenler</p>
          <ul className="space-y-1 text-sm">
            {day.extraFoods.map((food) => (
              <li key={food.id} className="flex justify-between">
                <span>
                  {MEAL_TYPE_LABELS[food.mealType]} · {food.name} — {food.quantity} {UNIT_LABELS[food.unit]}
                </span>
                <span className="text-muted-foreground">{food.calories} kcal</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {day.water.length > 0 && (
        <p className="mb-3 text-sm text-foreground/90">
          Su: {day.water.map((entry) => `${entry.amountMl} ml`).join(" + ")} = {(day.waterTotalMl / 1000).toFixed(2)} L
        </p>
      )}

      <div className="border-t pt-3">
        <p className="mb-2 text-sm font-medium text-foreground">Yorumlarınız</p>
        {day.comments.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Bu güne henüz yorum yazmadınız.</p>}
        <ul className="mb-3 space-y-1 text-sm">
          {day.comments.map((comment) => (
            <li key={comment.id} className="rounded-md bg-muted/50 px-3 py-2">
              {comment.body}
            </li>
          ))}
        </ul>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Danışana bu günle ilgili geri bildirim yazın"
          maxLength={1000}
        />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        <Button
          className="mt-2"
          size="sm"
          disabled={commentMutation.isLoading || body.trim().length === 0}
          onClick={() => commentMutation.mutate({ clientId, logDate: day.date, body })}
        >
          Yorumu Gönder
        </Button>
      </div>
    </Card>
  );
}
