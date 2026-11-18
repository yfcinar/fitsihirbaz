"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { DietPlanMealItemView, MeasurementUnit } from "@fit-sihirbaz/shared";
import { UNIT_LABELS } from "@/components/tracking/tracking-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  item: DietPlanMealItemView;
  // Silme yalnızca taslakta yapılabilir; gönderilmiş planda miktar değiştirilebilir ama kalem silinemez.
  canDelete: boolean;
  onChanged: () => void;
}

export function MealItemRow({ item, canDelete, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState<MeasurementUnit>(item.unit);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = trpc.dietPlans.updateMealItem.useMutation({
    onSuccess: () => {
      setEditing(false);
      setError(null);
      onChanged();
    },
    onError: (err) => setError(err.message),
  });
  const removeMutation = trpc.dietPlans.removeMealItem.useMutation({
    onSuccess: onChanged,
    onError: (err) => setError(err.message),
  });

  const isRecipe = item.recipeId !== null;

  return (
    <li className="text-sm">
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{item.itemName}</span>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-20"
            aria-label="Miktar"
          />
          {isRecipe ? (
            <span className="text-muted-foreground">porsiyon</span>
          ) : (
            <Select value={unit} onValueChange={(value) => setUnit(value as MeasurementUnit)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UNIT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            disabled={updateMutation.isLoading || !(Number(quantity) > 0)}
            onClick={() => updateMutation.mutate({ dietPlanMealItemId: item.id, quantity: Number(quantity), unit })}
          >
            Kaydet
          </Button>
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => {
              setEditing(false);
              setQuantity(String(item.quantity));
              setUnit(item.unit);
              setError(null);
            }}
          >
            Vazgeç
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground/90">
            {item.itemName} — {item.quantity} {UNIT_LABELS[item.unit]}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-muted-foreground">{Math.round(item.calories)} kcal</span>
            <button type="button" className="text-primary hover:underline" onClick={() => setEditing(true)}>
              Düzenle
            </button>
            {canDelete && (
              <button
                type="button"
                className="text-destructive hover:underline"
                disabled={removeMutation.isLoading}
                onClick={() => {
                  if (window.confirm(`"${item.itemName}" bu öğünden silinsin mi?`)) {
                    removeMutation.mutate({ dietPlanMealItemId: item.id });
                  }
                }}
              >
                Sil
              </button>
            )}
          </span>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </li>
  );
}
