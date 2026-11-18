import type {
  DayComment as DayCommentRow,
  DietitianProfile,
  FoodItem,
  FoodLogEntry as FoodLogEntryRow,
  MealItemLog,
  User,
  WaterLog as WaterLogRow,
} from "@fit-sihirbaz/db";
import type {
  DayAdherence,
  DayComment,
  FoodEntry,
  NutrientSummary,
  PlannedItemLog,
  TrackingDay,
  TrackingDaySummary,
  WaterEntry,
} from "@fit-sihirbaz/shared";
import { buildMealItemView, type DietPlanWithHierarchy } from "../diet-plans/diet-plans.mapper";

type PlanDayRow = DietPlanWithHierarchy["days"][number];
type PlanMealRow = PlanDayRow["meals"][number];
type PlanItemRow = PlanMealRow["items"][number] & { logs: MealItemLog[] };
type TrackingMealRow = Omit<PlanMealRow, "items"> & { items: PlanItemRow[] };
type TrackingDayRow = Omit<PlanDayRow, "meals"> & { meals: TrackingMealRow[] };
export type TrackingPlanRow = Omit<DietPlanWithHierarchy, "days"> & { days: TrackingDayRow[] };

export type FoodLogRowWithFood = FoodLogEntryRow & { foodItem: Pick<FoodItem, "name"> | null };
export type DayCommentWithAuthor = DayCommentRow & {
  dietitian: DietitianProfile & { user: Pick<User, "firstName" | "lastName"> };
};

const DAY_MS = 86_400_000;

export function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// Plan günleri 1'den başlar: başlangıç tarihi = 1. gün.
export function planDayNumber(startDate: Date, date: Date): number {
  return Math.round((date.getTime() - startDate.getTime()) / DAY_MS) + 1;
}

const STATUS_WEIGHT = { EATEN: 1, PARTIAL: 0.5, SKIPPED: 0 } as const;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildAdherence(statuses: Array<MealItemLog["status"] | null>): DayAdherence {
  const plannedCount = statuses.length;
  const eatenCount = statuses.filter((status) => status === "EATEN").length;
  const partialCount = statuses.filter((status) => status === "PARTIAL").length;
  const skippedCount = statuses.filter((status) => status === "SKIPPED").length;
  const eatenWeight = statuses.reduce<number>((sum, status) => sum + (status ? STATUS_WEIGHT[status] : 0), 0);
  return {
    plannedCount,
    eatenCount,
    partialCount,
    skippedCount,
    adherencePercent: plannedCount === 0 ? null : Math.round((eatenWeight / plannedCount) * 100),
  };
}

export function toFoodEntry(row: FoodLogRowWithFood): FoodEntry {
  return {
    id: row.id,
    mealType: row.mealType,
    name: row.foodItem?.name ?? row.customName ?? "Besin",
    quantity: Number(row.quantity),
    unit: row.unit,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
  };
}

export function toWaterEntry(row: WaterLogRow): WaterEntry {
  return { id: row.id, amountMl: row.amountMl, createdAt: row.createdAt.toISOString() };
}

export function toDayComment(row: DayCommentWithAuthor): DayComment {
  const { firstName, lastName } = row.dietitian.user;
  return {
    id: row.id,
    dietitianId: row.dietitianId,
    dietitianName: `${firstName} ${lastName}`.trim(),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface BuildTrackingDayParams {
  date: Date;
  plans: TrackingPlanRow[];
  foodEntries: FoodLogRowWithFood[];
  waterLogs: WaterLogRow[];
  comments: DayCommentWithAuthor[];
}

// Tüm satırlar daha geniş bir aralık için de verilebilir; burada sadece `date` gününe ait olanlar
// kullanılır. Böylece aralık özeti (getRange) ve tek gün görünümü aynı hesabı paylaşır.
export function buildTrackingDay(params: BuildTrackingDayParams): TrackingDay {
  const dateString = toDateString(params.date);

  const plannedItems: PlannedItemLog[] = [];
  const consumed: NutrientSummary = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  for (const plan of params.plans) {
    const dayNumber = planDayNumber(plan.startDate, params.date);
    const day = plan.days.find((candidate) => candidate.dayNumber === dayNumber);
    if (!day) {
      continue;
    }
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const view = buildMealItemView(item);
        const log = item.logs.find((candidate) => toDateString(candidate.logDate) === dateString) ?? null;
        plannedItems.push({
          dietPlanMealItemId: item.id,
          dietPlanId: plan.id,
          dietPlanTitle: plan.title,
          mealType: meal.mealType,
          name: view.itemName,
          quantity: view.quantity,
          unit: view.unit,
          status: log?.status ?? null,
          note: log?.note ?? null,
        });
        if (log) {
          const weight = STATUS_WEIGHT[log.status];
          consumed.calories += view.calories * weight;
          consumed.protein += view.protein * weight;
          consumed.carbs += view.carbs * weight;
          consumed.fat += view.fat * weight;
        }
      }
    }
  }

  const extraFoods = params.foodEntries
    .filter((entry) => toDateString(entry.logDate) === dateString)
    .map(toFoodEntry);
  for (const entry of extraFoods) {
    consumed.calories += entry.calories;
    consumed.protein += entry.protein;
    consumed.carbs += entry.carbs;
    consumed.fat += entry.fat;
  }

  const water = params.waterLogs.filter((entry) => toDateString(entry.logDate) === dateString).map(toWaterEntry);
  const comments = params.comments
    .filter((entry) => toDateString(entry.logDate) === dateString)
    .map(toDayComment);

  return {
    date: dateString,
    plannedItems,
    extraFoods,
    water,
    waterTotalMl: water.reduce((sum, entry) => sum + entry.amountMl, 0),
    comments,
    adherence: buildAdherence(plannedItems.map((item) => item.status)),
    consumed: {
      calories: round2(consumed.calories),
      protein: round2(consumed.protein),
      carbs: round2(consumed.carbs),
      fat: round2(consumed.fat),
    },
  };
}

export function toDaySummary(day: TrackingDay): TrackingDaySummary {
  return {
    date: day.date,
    adherence: day.adherence,
    waterTotalMl: day.waterTotalMl,
    consumedCalories: day.consumed.calories,
    extraFoodCount: day.extraFoods.length,
    commentCount: day.comments.length,
  };
}
