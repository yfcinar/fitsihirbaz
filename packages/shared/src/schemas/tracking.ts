import { z } from "zod";
import { optionalCoerced } from "./common";

const dateString = z.string().date("YYYY-MM-DD formatında olmalı");

export const MealLogStatusSchema = z.enum(["EATEN", "PARTIAL", "SKIPPED"]);
export type MealLogStatus = z.infer<typeof MealLogStatusSchema>;

const MealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
const MeasurementUnitSchema = z.enum(["GRAM", "ML", "PORTION", "PIECE"]);

export const NutrientSummarySchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});
export type NutrientSummary = z.infer<typeof NutrientSummarySchema>;

// ---- Girdiler (danışan) ----

// status null: işareti geri al.
export const SetMealItemStatusInputSchema = z.object({
  dietPlanMealItemId: z.string().uuid(),
  logDate: dateString,
  status: MealLogStatusSchema.nullable(),
  note: z.string().max(500).optional(),
});
export type SetMealItemStatusInput = z.infer<typeof SetMealItemStatusInputSchema>;

// Besin veritabanından (foodItemId) veya serbest isimle (customName + kalori) eklenir.
export const AddFoodEntryInputSchema = z
  .object({
    logDate: dateString,
    mealType: MealTypeSchema,
    foodItemId: z.string().uuid().optional(),
    customName: z.string().trim().min(1).max(120).optional(),
    quantity: z.coerce.number().positive().max(100000),
    unit: MeasurementUnitSchema,
    // Serbest girişte besin değerleri danışandan alınır; veritabanı besini için hesaplanır.
    customCalories: optionalCoerced(z.coerce.number().min(0).max(10000)),
    customProtein: optionalCoerced(z.coerce.number().min(0).max(1000)),
    customCarbs: optionalCoerced(z.coerce.number().min(0).max(1000)),
    customFat: optionalCoerced(z.coerce.number().min(0).max(1000)),
  })
  .refine((value) => Boolean(value.foodItemId) !== Boolean(value.customName), {
    message: "foodItemId veya customName'den tam biri verilmeli",
  })
  .refine((value) => !value.customName || value.customCalories !== undefined, {
    message: "Serbest girişte kalori zorunlu",
    path: ["customCalories"],
  });
export type AddFoodEntryInput = z.infer<typeof AddFoodEntryInputSchema>;

export const DeleteEntryInputSchema = z.object({ id: z.string().uuid() });
export type DeleteEntryInput = z.infer<typeof DeleteEntryInputSchema>;

export const AddWaterInputSchema = z.object({
  logDate: dateString,
  amountMl: z.coerce.number().int().min(10).max(5000),
});
export type AddWaterInput = z.infer<typeof AddWaterInputSchema>;

// ---- Gün görünümü (danışan ve diyetisyen aynı şekli görür) ----

export const PlannedItemLogSchema = z.object({
  dietPlanMealItemId: z.string().uuid(),
  dietPlanId: z.string().uuid(),
  dietPlanTitle: z.string(),
  mealType: MealTypeSchema,
  name: z.string(),
  quantity: z.number(),
  unit: MeasurementUnitSchema,
  status: MealLogStatusSchema.nullable(),
  note: z.string().nullable(),
});
export type PlannedItemLog = z.infer<typeof PlannedItemLogSchema>;

export const FoodEntrySchema = z.object({
  id: z.string().uuid(),
  mealType: MealTypeSchema,
  name: z.string(),
  quantity: z.number(),
  unit: MeasurementUnitSchema,
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});
export type FoodEntry = z.infer<typeof FoodEntrySchema>;

export const WaterEntrySchema = z.object({
  id: z.string().uuid(),
  amountMl: z.number().int(),
  createdAt: z.string(),
});
export type WaterEntry = z.infer<typeof WaterEntrySchema>;

export const DayCommentSchema = z.object({
  id: z.string().uuid(),
  dietitianId: z.string().uuid(),
  dietitianName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type DayComment = z.infer<typeof DayCommentSchema>;

export const DayAdherenceSchema = z.object({
  plannedCount: z.number().int(),
  eatenCount: z.number().int(),
  partialCount: z.number().int(),
  skippedCount: z.number().int(),
  // Planlanan kalemler içinde yenen (EATEN=1, PARTIAL=0.5) oranı, 0-100. Kalem yoksa null.
  adherencePercent: z.number().nullable(),
});
export type DayAdherence = z.infer<typeof DayAdherenceSchema>;

export const TrackingDaySchema = z.object({
  date: z.string(),
  plannedItems: z.array(PlannedItemLogSchema),
  extraFoods: z.array(FoodEntrySchema),
  water: z.array(WaterEntrySchema),
  waterTotalMl: z.number().int(),
  comments: z.array(DayCommentSchema),
  adherence: DayAdherenceSchema,
  // Yenen plan kalemleri + plan dışı besinler toplamı.
  consumed: NutrientSummarySchema,
});
export type TrackingDay = z.infer<typeof TrackingDaySchema>;

export const GetTrackingDayInputSchema = z.object({
  date: dateString,
  // Diyetisyen için zorunlu, danışan için yok sayılır.
  clientId: z.string().uuid().optional(),
});
export type GetTrackingDayInput = z.infer<typeof GetTrackingDayInputSchema>;

// ---- Aralık özeti (diyetisyen takip tablosu) ----

export const TrackingRangeInputSchema = z
  .object({
    clientId: z.string().uuid(),
    from: dateString,
    to: dateString,
  })
  .refine((value) => value.from <= value.to, { message: "from, to'dan büyük olamaz", path: ["from"] })
  .refine((value) => (Date.parse(value.to) - Date.parse(value.from)) / 86_400_000 <= 92, {
    message: "En fazla 93 günlük aralık sorgulanabilir",
    path: ["to"],
  });
export type TrackingRangeInput = z.infer<typeof TrackingRangeInputSchema>;

export const TrackingDaySummarySchema = z.object({
  date: z.string(),
  adherence: DayAdherenceSchema,
  waterTotalMl: z.number().int(),
  consumedCalories: z.number(),
  extraFoodCount: z.number().int(),
  commentCount: z.number().int(),
});
export type TrackingDaySummary = z.infer<typeof TrackingDaySummarySchema>;

export const AddDayCommentInputSchema = z.object({
  clientId: z.string().uuid(),
  logDate: dateString,
  body: z.string().trim().min(1, "Yorum boş olamaz").max(1000),
});
export type AddDayCommentInput = z.infer<typeof AddDayCommentInputSchema>;
