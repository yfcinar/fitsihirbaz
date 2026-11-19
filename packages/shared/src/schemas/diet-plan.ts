import { z } from "zod";
import { optionalCoerced } from "./common";

export const DietPlanStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]);
export type DietPlanStatus = z.infer<typeof DietPlanStatusSchema>;

export const MealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const MeasurementUnitSchema = z.enum(["GRAM", "ML", "PORTION", "PIECE"]);
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;

export const NutrientTotalsSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});
export type NutrientTotals = z.infer<typeof NutrientTotalsSchema>;

export const CreateDietPlanInputSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1, "Başlık zorunlu").max(200),
  startDate: z.string().date("YYYY-MM-DD formatında olmalı"),
  endDate: optionalCoerced(z.string().date("YYYY-MM-DD formatında olmalı")),
  targetCalories: optionalCoerced(z.coerce.number().int().positive()),
  targetProteinG: optionalCoerced(z.coerce.number().nonnegative()),
  targetCarbsG: optionalCoerced(z.coerce.number().nonnegative()),
  targetFatG: optionalCoerced(z.coerce.number().nonnegative()),
});
export type CreateDietPlanInput = z.infer<typeof CreateDietPlanInputSchema>;

export const AddDietPlanDayInputSchema = z.object({
  dietPlanId: z.string().uuid(),
  dayNumber: z.coerce.number().int().positive(),
});
export type AddDietPlanDayInput = z.infer<typeof AddDietPlanDayInputSchema>;

export const AddDietPlanMealInputSchema = z.object({
  dietPlanDayId: z.string().uuid(),
  mealType: MealTypeSchema,
  plannedTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM formatında olmalı")
    .optional(),
  note: z.string().trim().max(500).optional(),
});
export type AddDietPlanMealInput = z.infer<typeof AddDietPlanMealInputSchema>;

// Öğün saati/notu güncelleme: alan verilmezse değişmez, null verilirse temizlenir.
// Hem taslakta hem gönderilmiş planda yapılabilir (kayıt silinmez, danışan günlüğü korunur).
export const UpdateDietPlanMealInputSchema = z.object({
  dietPlanMealId: z.string().uuid(),
  plannedTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM formatında olmalı")
    .nullable()
    .optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type UpdateDietPlanMealInput = z.infer<typeof UpdateDietPlanMealInputSchema>;

// foodItemId veya recipeId'den yalnızca biri belirtilmeli (bkz. DATABASE.md §13).
// Recipe seçildiğinde quantity, tarifin kaç porsiyonunun ekleneceğini belirtir (unit=PORTION olmalı).
export const AddDietPlanMealItemInputSchema = z
  .object({
    dietPlanMealId: z.string().uuid(),
    foodItemId: z.string().uuid().optional(),
    recipeId: z.string().uuid().optional(),
    quantity: z.coerce.number().positive(),
    unit: MeasurementUnitSchema,
  })
  .refine((data) => Boolean(data.foodItemId) !== Boolean(data.recipeId), {
    message: "foodItemId veya recipeId'den yalnızca biri belirtilmeli",
    path: ["foodItemId"],
  });
export type AddDietPlanMealItemInput = z.infer<typeof AddDietPlanMealItemInputSchema>;

export const DietPlanMealItemViewSchema = NutrientTotalsSchema.extend({
  id: z.string().uuid(),
  foodItemId: z.string().uuid().nullable(),
  recipeId: z.string().uuid().nullable(),
  itemName: z.string(),
  quantity: z.number(),
  unit: MeasurementUnitSchema,
});
export type DietPlanMealItemView = z.infer<typeof DietPlanMealItemViewSchema>;

export const DietPlanMealViewSchema = z.object({
  id: z.string().uuid(),
  mealType: MealTypeSchema,
  plannedTime: z.string().nullable(),
  note: z.string().nullable(),
  items: z.array(DietPlanMealItemViewSchema),
  totals: NutrientTotalsSchema,
});
export type DietPlanMealView = z.infer<typeof DietPlanMealViewSchema>;

export const DietPlanDayViewSchema = z.object({
  id: z.string().uuid(),
  dayNumber: z.number().int(),
  meals: z.array(DietPlanMealViewSchema),
  totals: NutrientTotalsSchema,
});
export type DietPlanDayView = z.infer<typeof DietPlanDayViewSchema>;

export const DietPlanSummarySchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  dietitianId: z.string().uuid().nullable(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  targetCalories: z.number().int().nullable(),
  targetProteinG: z.number().nullable(),
  targetCarbsG: z.number().nullable(),
  targetFatG: z.number().nullable(),
  status: DietPlanStatusSchema,
});
export type DietPlanSummary = z.infer<typeof DietPlanSummarySchema>;

export const DietPlanDetailSchema = DietPlanSummarySchema.extend({
  days: z.array(DietPlanDayViewSchema),
  totals: NutrientTotalsSchema,
});
export type DietPlanDetail = z.infer<typeof DietPlanDetailSchema>;

export const SendDietPlanInputSchema = z.object({
  dietPlanId: z.string().uuid(),
});
export type SendDietPlanInput = z.infer<typeof SendDietPlanInputSchema>;

// Plan düzenleme: miktar/birim güncelleme (taslak ve gönderilmiş planda), silme ve gün kopyalama
// (yalnızca taslakta; gönderilmiş planda silmek danışanın günlük kayıtlarını da silerdi).
export const UpdateDietPlanMealItemInputSchema = z.object({
  dietPlanMealItemId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: MeasurementUnitSchema,
});
export type UpdateDietPlanMealItemInput = z.infer<typeof UpdateDietPlanMealItemInputSchema>;

export const RemoveDietPlanMealItemInputSchema = z.object({ dietPlanMealItemId: z.string().uuid() });
export type RemoveDietPlanMealItemInput = z.infer<typeof RemoveDietPlanMealItemInputSchema>;

export const RemoveDietPlanMealInputSchema = z.object({ dietPlanMealId: z.string().uuid() });
export type RemoveDietPlanMealInput = z.infer<typeof RemoveDietPlanMealInputSchema>;

export const RemoveDietPlanDayInputSchema = z.object({ dietPlanDayId: z.string().uuid() });
export type RemoveDietPlanDayInput = z.infer<typeof RemoveDietPlanDayInputSchema>;

export const CopyDietPlanDayInputSchema = z.object({ dietPlanDayId: z.string().uuid() });
export type CopyDietPlanDayInput = z.infer<typeof CopyDietPlanDayInputSchema>;

export const RemovedResultSchema = z.object({ removed: z.literal(true) });

export const DuplicateForNewCalorieTargetInputSchema = z.object({
  dietPlanId: z.string().uuid(),
  newTargetCalories: z.coerce.number().int().positive(),
  newTitle: optionalCoerced(z.string().min(1).max(200)),
});
export type DuplicateForNewCalorieTargetInput = z.infer<typeof DuplicateForNewCalorieTargetInputSchema>;

// CLIENT kendi planlarını listeler (clientId yok sayılır); DIETITIAN kendi oluşturduğu
// planları belirli bir danışan için listeler (clientId zorunlu).
export const ListDietPlansInputSchema = z.object({
  clientId: z.string().uuid().optional(),
});
export type ListDietPlansInput = z.infer<typeof ListDietPlansInputSchema>;

// ── Diyet şablonları ──────────────────────────────────────────
// Şablon içeriği: plan hiyerarşisinin besin kimlikleriyle anlık görüntüsü. Veritabanında JSON saklanır,
// uygularken bu şemayla doğrulanır (elle bozulmuş/eski içerik güvenle reddedilir).
export const DietPlanTemplateContentSchema = z.object({
  days: z.array(
    z.object({
      dayNumber: z.number().int().positive(),
      meals: z.array(
        z.object({
          mealType: MealTypeSchema,
          plannedTime: z.string().nullable(),
          note: z.string().nullable(),
          items: z.array(
            z.object({
              foodItemId: z.string().uuid().nullable(),
              recipeId: z.string().uuid().nullable(),
              quantity: z.number().positive(),
              unit: MeasurementUnitSchema,
            }),
          ),
        }),
      ),
    }),
  ),
});
export type DietPlanTemplateContent = z.infer<typeof DietPlanTemplateContentSchema>;

export const DietPlanTemplateSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  targetCalories: z.number().int().nullable(),
  dayCount: z.number().int(),
  itemCount: z.number().int(),
  createdAt: z.string(),
});
export type DietPlanTemplateSummary = z.infer<typeof DietPlanTemplateSummarySchema>;

export const SaveDietPlanAsTemplateInputSchema = z.object({
  dietPlanId: z.string().uuid(),
  name: z.string().trim().min(1, "Şablon adı zorunlu").max(120),
  description: optionalCoerced(z.string().trim().max(500)),
});
export type SaveDietPlanAsTemplateInput = z.infer<typeof SaveDietPlanAsTemplateInputSchema>;

export const ApplyDietPlanTemplateInputSchema = z.object({
  templateId: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().trim().min(1, "Başlık zorunlu").max(200),
  startDate: z.string().date("YYYY-MM-DD formatında olmalı"),
  targetCalories: optionalCoerced(z.coerce.number().int().positive()),
});
export type ApplyDietPlanTemplateInput = z.infer<typeof ApplyDietPlanTemplateInputSchema>;

export const ApplyDietPlanTemplateResultSchema = z.object({
  plan: DietPlanSummarySchema,
  // Şablondaki besin/tarif artık yoksa o kalem atlanır; kaç kalemin atlandığı bildirilir.
  skippedItems: z.number().int(),
});
export type ApplyDietPlanTemplateResult = z.infer<typeof ApplyDietPlanTemplateResultSchema>;

export const DeleteDietPlanTemplateInputSchema = z.object({ templateId: z.string().uuid() });
export type DeleteDietPlanTemplateInput = z.infer<typeof DeleteDietPlanTemplateInputSchema>;
