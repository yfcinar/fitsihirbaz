"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Droplets, Trash2 } from "lucide-react";
import { MEAL_TYPE_LABELS, type MealLogStatus, type MealType, type MeasurementUnit } from "@fit-sihirbaz/shared";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/EmptyState";
import { QueryErrorNotice } from "@/components/QueryErrorNotice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ConsumedSummary,
  formatDateTr,
  localDateString,
  shiftDateString,
  STATUS_LABELS,
  StatusBadge,
  UNIT_LABELS,
} from "@/components/tracking/tracking-ui";

const WATER_QUICK_ADD_ML = [200, 250, 500, 1000];
const STATUS_ORDER: MealLogStatus[] = ["EATEN", "PARTIAL", "SKIPPED"];

export default function GunlukPage() {
  const today = localDateString();
  const [date, setDate] = useState(today);
  const utils = trpc.useUtils();
  const dayQuery = trpc.tracking.getDay.useQuery({ date });

  const refresh = () => utils.tracking.getDay.invalidate({ date });
  const statusMutation = trpc.tracking.setMealItemStatus.useMutation({ onSuccess: refresh });
  const waterMutation = trpc.tracking.addWater.useMutation({ onSuccess: refresh });
  const deleteWaterMutation = trpc.tracking.deleteWater.useMutation({ onSuccess: refresh });
  const deleteFoodMutation = trpc.tracking.deleteFoodEntry.useMutation({ onSuccess: refresh });

  const day = dayQuery.data;
  const isFuture = date > today;
  const mutationError = statusMutation.error ?? waterMutation.error ?? deleteWaterMutation.error ?? deleteFoodMutation.error;

  const itemsByMeal = new Map<MealType, NonNullable<typeof day>["plannedItems"]>();
  for (const item of day?.plannedItems ?? []) {
    itemsByMeal.set(item.mealType, [...(itemsByMeal.get(item.mealType) ?? []), item]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" aria-label="Önceki gün" onClick={() => setDate(shiftDateString(date, -1))}>
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <h1 className="text-lg font-semibold capitalize text-foreground">{formatDateTr(date)}</h1>
          {date === today ? (
            <p className="text-xs text-muted-foreground">Bugün</p>
          ) : (
            <button className="text-xs text-primary hover:underline" onClick={() => setDate(today)}>
              Bugüne dön
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Sonraki gün"
          disabled={date >= today}
          onClick={() => setDate(shiftDateString(date, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {dayQuery.isError && <QueryErrorNotice message={dayQuery.error.message} onRetry={() => dayQuery.refetch()} />}
      {mutationError && <p className="text-sm text-destructive">{mutationError.message}</p>}
      {dayQuery.isLoading && <p className="text-muted-foreground">Yükleniyor...</p>}

      {day && (
        <>
          <Card className="p-4">
            <p className="mb-1 text-sm font-medium text-foreground">Bugüne kadar aldıklarınız</p>
            <ConsumedSummary consumed={day.consumed} waterTotalMl={day.waterTotalMl} />
            {day.adherence.adherencePercent !== null && (
              <p className="mt-1 text-sm text-foreground/90">
                Plana uyum: %{day.adherence.adherencePercent} ({day.adherence.eatenCount}/{day.adherence.plannedCount} öğe)
              </p>
            )}
          </Card>

          <section>
            <h2 className="mb-2 font-medium text-foreground">Diyet Planım</h2>
            {day.plannedItems.length === 0 && (
              <EmptyState
                title="Bu gün için planlanmış öğün yok"
                description="Diyetisyeniniz aktif bir plan gönderdiğinde öğünleriniz burada görünür."
              />
            )}
            {[...itemsByMeal.entries()].map(([mealType, items]) => (
              <Card key={mealType} className="mb-3 p-3">
                <p className="mb-2 text-sm font-medium text-foreground">{MEAL_TYPE_LABELS[mealType]}</p>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.dietPlanMealItemId}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span>
                          {item.name} — {item.quantity} {UNIT_LABELS[item.unit]}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      {!isFuture && (
                        <div className="flex flex-wrap gap-2">
                          {STATUS_ORDER.map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={item.status === status ? "default" : "outline"}
                              disabled={statusMutation.isLoading}
                              onClick={() =>
                                statusMutation.mutate({
                                  dietPlanMealItemId: item.dietPlanMealItemId,
                                  logDate: date,
                                  // Aynı düğmeye tekrar basmak işareti geri alır.
                                  status: item.status === status ? null : status,
                                })
                              }
                            >
                              {STATUS_LABELS[status]}
                            </Button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </section>

          <section>
            <h2 className="mb-2 font-medium text-foreground">Plan Dışı Yediklerim</h2>
            {day.extraFoods.length > 0 && (
              <Card className="mb-3 divide-y">
                {day.extraFoods.map((food) => (
                  <div key={food.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      {MEAL_TYPE_LABELS[food.mealType]} · {food.name} — {food.quantity} {UNIT_LABELS[food.unit]}
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {food.calories} kcal
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Sil"
                        disabled={deleteFoodMutation.isLoading}
                        onClick={() => deleteFoodMutation.mutate({ id: food.id })}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </div>
                ))}
              </Card>
            )}
            {!isFuture && <FoodEntryForm date={date} onAdded={refresh} />}
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 font-medium text-foreground">
              <Droplets className="h-4 w-4 text-primary" /> Su
            </h2>
            <Card className="p-3">
              <p className="mb-2 text-sm text-foreground/90">Toplam: {(day.waterTotalMl / 1000).toFixed(2)} L</p>
              {!isFuture && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {WATER_QUICK_ADD_ML.map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant="outline"
                      disabled={waterMutation.isLoading}
                      onClick={() => waterMutation.mutate({ logDate: date, amountMl: amount })}
                    >
                      +{amount} ml
                    </Button>
                  ))}
                </div>
              )}
              {day.water.length > 0 && (
                <ul className="flex flex-wrap gap-2 text-sm">
                  {day.water.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      {entry.amountMl} ml
                      <button
                        aria-label="Su kaydını sil"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteWaterMutation.mutate({ id: entry.id })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {day.comments.length > 0 && (
            <section>
              <h2 className="mb-2 font-medium text-foreground">Diyetisyeninizin Yorumları</h2>
              <ul className="space-y-2">
                {day.comments.map((comment) => (
                  <li key={comment.id} className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    <p className="text-xs text-muted-foreground">{comment.dietitianName}</p>
                    {comment.body}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FoodEntryForm({ date, onAdded }: { date: string; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [mealType, setMealType] = useState<MealType>("SNACK");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<MeasurementUnit>("GRAM");
  const [error, setError] = useState<string | null>(null);

  const searchQuery = trpc.foods.search.useQuery(
    { query, limit: 8 },
    { enabled: !selected && !customName && query.trim().length > 1 },
  );
  const addMutation = trpc.tracking.addFoodEntry.useMutation({
    onSuccess: () => {
      setQuery("");
      setSelected(null);
      setCustomName("");
      setCustomCalories("");
      setError(null);
      onAdded();
    },
    onError: (err) => setError(err.message),
  });

  const usingCustom = customName.trim().length > 0;
  const canSubmit = (selected !== null || (usingCustom && customCalories !== "")) && Number(quantity) > 0;

  return (
    <Card className="p-3">
      <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        {selected ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>{selected.name}</span>
            <button className="text-xs text-primary hover:underline" onClick={() => setSelected(null)}>
              Değiştir
            </button>
          </div>
        ) : (
          <Input
            placeholder="Besin ara (örn. elma) veya aşağıya kendi yemeğinizi yazın"
            value={query}
            disabled={usingCustom}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {MEAL_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selected && searchQuery.data && searchQuery.data.items.length > 0 && (
        <ul className="mb-2 max-h-40 divide-y overflow-y-auto rounded-md border text-sm">
          {searchQuery.data.items.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                className="flex w-full justify-between px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => setSelected({ id: food.id, name: food.name })}
              >
                <span>{food.name}</span>
                <span className="text-muted-foreground">{food.calories} kcal/100g</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selected && (
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Listede yoksa: yemeğin adı"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="Toplam kalori (kcal)"
            value={customCalories}
            disabled={!usingCustom}
            onChange={(event) => setCustomCalories(event.target.value)}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={1}
          className="w-24"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          aria-label="Miktar"
        />
        <Select value={unit} onValueChange={(value) => setUnit(value as MeasurementUnit)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(UNIT_LABELS) as MeasurementUnit[]).map((key) => (
              <SelectItem key={key} value={key}>
                {UNIT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={!canSubmit || addMutation.isLoading}
          onClick={() =>
            addMutation.mutate({
              logDate: date,
              mealType,
              quantity: Number(quantity),
              unit,
              ...(selected
                ? { foodItemId: selected.id }
                : { customName: customName.trim(), customCalories: Number(customCalories) }),
            })
          }
        >
          Ekle
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Card>
  );
}
