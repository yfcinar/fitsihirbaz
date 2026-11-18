"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { MealType } from "@fit-sihirbaz/shared";
import { MealItemAdder } from "./MealItemAdder";
import { MEAL_TYPE_LABELS, TotalsBadge } from "./diet-plan-ui";
import { MealItemRow } from "./MealItemRow";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Günün kalorisi hedefe göre ne kadar sapıyor: ±%5 içinde yeşil, aşırı sapmada uyarı rengi.
function TargetDelta({ calories, target }: { calories: number; target: number | null }) {
  if (!target || calories <= 0) return null;
  const diff = Math.round(calories - target);
  const ratio = Math.abs(diff) / target;
  const tone = ratio <= 0.05 ? "text-primary" : ratio <= 0.15 ? "text-foreground" : "text-destructive";
  return (
    <span className={`text-xs ${tone}`}>
      {diff === 0 ? "Hedefte" : `Hedefe göre ${diff > 0 ? "+" : ""}${diff} kcal`}
    </span>
  );
}

export function DietPlanBuilder({ planId }: { planId: string }) {
  const utils = trpc.useUtils();
  const planQuery = trpc.dietPlans.getById.useQuery({ id: planId });
  const [newCalorieTarget, setNewCalorieTarget] = useState("");
  const [duplicateResultId, setDuplicateResultId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  function refetchPlan() {
    utils.dietPlans.getById.invalidate({ id: planId });
  }

  const [confirmSend, setConfirmSend] = useState(false);
  const sendMutation = trpc.dietPlans.send.useMutation({
    onSuccess: () => {
      setConfirmSend(false);
      refetchPlan();
    },
  });

  const addDayMutation = trpc.dietPlans.addDay.useMutation({ onSuccess: refetchPlan });
  const copyDayMutation = trpc.dietPlans.copyDay.useMutation({ onSuccess: refetchPlan });
  const removeDayMutation = trpc.dietPlans.removeDay.useMutation({ onSuccess: refetchPlan });
  const removeMealMutation = trpc.dietPlans.removeMeal.useMutation({ onSuccess: refetchPlan });
  const addMealMutation = trpc.dietPlans.addMeal.useMutation({ onSuccess: refetchPlan });
  const duplicateMutation = trpc.dietPlans.duplicateForNewCalorieTarget.useMutation({
    onSuccess: (result) => {
      setDuplicateError(null);
      setDuplicateResultId(result.id);
    },
    onError: (err) => setDuplicateError(err.message),
  });

  const [pendingMealDayId, setPendingMealDayId] = useState<string | null>(null);
  const [pendingMealType, setPendingMealType] = useState<MealType>("BREAKFAST");

  if (planQuery.isLoading || !planQuery.data) {
    return <p className="text-muted-foreground">Plan yükleniyor...</p>;
  }
  const plan = planQuery.data;
  const isDraft = plan.status === "DRAFT";

  return (
    <div>
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{plan.title}</h2>
            <p className="text-sm text-muted-foreground">
              {plan.startDate}
              {plan.endDate ? ` – ${plan.endDate}` : ""} · Hedef: {plan.targetCalories ?? "-"} kcal
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">Plan Toplamı</p>
            <TotalsBadge totals={plan.totals} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
          {plan.status === "DRAFT" ? (
            <>
              <Badge variant="warning">Taslak — danışan henüz görmüyor</Badge>
              {confirmSend ? (
                <>
                  <span className="text-sm text-foreground/90">
                    Plan danışana gönderilecek ve önceki aktif planınız tamamlanacak. Emin misiniz?
                  </span>
                  <Button size="sm" disabled={sendMutation.isLoading} onClick={() => sendMutation.mutate({ dietPlanId: planId })}>
                    {sendMutation.isLoading ? "Gönderiliyor..." : "Evet, Gönder"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmSend(false)}>
                    Vazgeç
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setConfirmSend(true)}>
                  Danışana Gönder
                </Button>
              )}
            </>
          ) : (
            <Badge variant="success">
              {plan.status === "ACTIVE" ? "Danışana gönderildi — aktif" : "Tamamlandı"}
            </Badge>
          )}
          {sendMutation.error && <p className="text-sm text-destructive">{sendMutation.error.message}</p>}
        </div>
      </Card>

      <Card className="mb-6 flex flex-wrap items-end gap-2 bg-muted/30 p-4">
        <div className="space-y-1">
          <Label className="text-xs">Farklı kaloriye ayarla</Label>
          <Input
            type="number"
            min="1"
            value={newCalorieTarget}
            onChange={(event) => setNewCalorieTarget(event.target.value)}
            placeholder="örn. 1600"
            className="w-32"
          />
        </div>
        <Button
          variant="secondary"
          disabled={!newCalorieTarget || duplicateMutation.isLoading}
          onClick={() =>
            duplicateMutation.mutate({ dietPlanId: planId, newTargetCalories: Number(newCalorieTarget) })
          }
        >
          {duplicateMutation.isLoading ? "Oluşturuluyor..." : "Yeni Plan Oluştur"}
        </Button>
        {duplicateError && <p className="text-sm text-destructive">{duplicateError}</p>}
        {duplicateResultId && (
          <p className="text-sm text-primary">
            Yeni plan oluşturuldu (id: {duplicateResultId}) — bu sayfayı yeni plan için tekrar açabilirsiniz.
          </p>
        )}
      </Card>

      {plan.days.map((day) => (
        <Card key={day.id} className="mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-medium text-foreground">Gün {day.dayNumber}</h3>
              <TargetDelta calories={day.totals.calories} target={plan.targetCalories} />
              {isDraft && (
                <>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    disabled={copyDayMutation.isLoading}
                    onClick={() => copyDayMutation.mutate({ dietPlanDayId: day.id })}
                  >
                    Günü kopyala
                  </button>
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      if (window.confirm(`Gün ${day.dayNumber} ve içindeki tüm öğünler silinsin mi?`)) {
                        removeDayMutation.mutate({ dietPlanDayId: day.id });
                      }
                    }}
                  >
                    Günü sil
                  </button>
                </>
              )}
            </div>
            <TotalsBadge totals={day.totals} />
          </div>

          {day.meals.map((meal) => (
            <div key={meal.id} className="mb-3 rounded-md bg-muted/50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {MEAL_TYPE_LABELS[meal.mealType]}
                  {meal.plannedTime ? ` · ${meal.plannedTime}` : ""}
                </p>
                <TotalsBadge totals={meal.totals} />
              </div>
              <ul className="space-y-1.5">
                {meal.items.map((item) => (
                  <MealItemRow key={item.id} item={item} canDelete={isDraft} onChanged={refetchPlan} />
                ))}
              </ul>
              {isDraft && (
                <button
                  type="button"
                  className="mt-1 text-xs text-destructive hover:underline"
                  onClick={() => {
                    if (window.confirm("Bu öğün ve içindeki tüm besinler silinsin mi?")) {
                      removeMealMutation.mutate({ dietPlanMealId: meal.id });
                    }
                  }}
                >
                  Öğünü sil
                </button>
              )}
              <MealItemAdder mealId={meal.id} onAdded={refetchPlan} />
            </div>
          ))}

          {pendingMealDayId === day.id ? (
            <div className="flex items-center gap-2">
              <Select value={pendingMealType} onValueChange={(value) => setPendingMealType(value as MealType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                data-testid="confirm-add-meal-button"
                onClick={() => {
                  addMealMutation.mutate({ dietPlanDayId: day.id, mealType: pendingMealType });
                  setPendingMealDayId(null);
                }}
              >
                Ekle
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPendingMealDayId(day.id)}
              data-testid="add-meal-button"
              className="text-sm font-medium text-primary hover:underline"
            >
              + Öğün Ekle
            </button>
          )}
        </Card>
      ))}

      <Button
        variant="outline"
        disabled={addDayMutation.isLoading}
        data-testid="add-day-button"
        onClick={() =>
          addDayMutation.mutate({
            dietPlanId: planId,
            dayNumber: Math.max(0, ...plan.days.map((day) => day.dayNumber)) + 1,
          })
        }
      >
        + Gün Ekle
      </Button>
    </div>
  );
}
