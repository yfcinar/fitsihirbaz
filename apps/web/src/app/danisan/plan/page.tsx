"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MEAL_TYPE_LABELS, TotalsBadge } from "@/components/diet-plans/diet-plan-ui";
import { EmptyState } from "@/components/EmptyState";
import { QueryErrorNotice } from "@/components/QueryErrorNotice";
import { UNIT_LABELS } from "@/components/tracking/tracking-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DiyetlerimPage() {
  const plansQuery = trpc.dietPlans.list.useQuery({});
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Liste yeniden eskiye sıralı; aktif plan varsa o, yoksa en yeni plan varsayılan seçilir.
  const plans = plansQuery.data ?? [];
  const defaultPlanId = plans.find((plan) => plan.status === "ACTIVE")?.id ?? plans[0]?.id;
  const activePlanId = selectedPlanId ?? defaultPlanId;
  const planQuery = trpc.dietPlans.getById.useQuery({ id: activePlanId ?? "" }, { enabled: !!activePlanId });

  if (plansQuery.isLoading) {
    return <p className="text-muted-foreground">Yükleniyor...</p>;
  }

  if (plansQuery.isError) {
    return <QueryErrorNotice message={plansQuery.error.message} onRetry={() => plansQuery.refetch()} />;
  }

  if (!activePlanId) {
    return (
      <EmptyState
        title="Henüz size gönderilmiş bir diyet yok"
        description="Diyetisyeniniz bir plan hazırlayıp gönderdiğinde burada görünür ve size bildirim gelir."
      />
    );
  }

  if (planQuery.isError) {
    return <QueryErrorNotice message={planQuery.error.message} onRetry={() => planQuery.refetch()} />;
  }

  if (planQuery.isLoading || !planQuery.data) {
    return <p className="text-muted-foreground">Plan yükleniyor...</p>;
  }

  const plan = planQuery.data;

  return (
    <div>
      {plans.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {plans.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={item.id === activePlanId ? "default" : "outline"}
              onClick={() => setSelectedPlanId(item.id)}
            >
              {item.title} {item.status === "ACTIVE" ? "(Aktif)" : "(Tamamlandı)"}
            </Button>
          ))}
        </div>
      )}

      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{plan.title}</h1>
              <Badge variant={plan.status === "ACTIVE" ? "success" : "secondary"}>
                {plan.status === "ACTIVE" ? "Aktif" : "Tamamlandı"}
              </Badge>
            </div>
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
      </Card>

      {plan.days.map((day) => (
        <Card key={day.id} className="mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium text-foreground">Gün {day.dayNumber}</h2>
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
              <ul className="space-y-1 text-sm text-foreground/90">
                {meal.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.itemName} — {item.quantity} {UNIT_LABELS[item.unit]}
                    </span>
                    <span className="text-muted-foreground">{item.calories} kcal</span>
                  </li>
                ))}
              </ul>
              {meal.items.length === 0 && <p className="text-sm text-muted-foreground">Bu öğüne henüz besin eklenmedi.</p>}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
