import { Injectable, Logger } from "@nestjs/common";
import type {
  AddDietPlanDayInput,
  AddDietPlanMealInput,
  AddDietPlanMealItemInput,
  CreateDietPlanInput,
  DietPlanDayView,
  DietPlanDetail,
  DietPlanMealItemView,
  DietPlanMealView,
  DietPlanSummary,
  DuplicateForNewCalorieTargetInput,
  Role,
  UpdateDietPlanMealItemInput,
} from "@fit-sihirbaz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  ClientNotLinkedError,
  DietPlanAccessDeniedError,
  DietPlanDayNotFoundError,
  DietPlanFoodItemNotFoundError,
  DietPlanCompletedError,
  DietPlanHasNoItemsError,
  DietPlanItemNotFoundError,
  DietPlanMealNotFoundError,
  DietPlanNotDraftError,
  DietPlanNotFoundError,
  DietPlanRecipeNotFoundError,
  DietitianProfileNotFoundError,
  EmptyDietPlanError,
  MissingClientIdError,
} from "./diet-plans.errors";
import {
  buildDayView,
  buildMealItemView,
  type DietPlanWithHierarchy,
  toDietPlanDetail,
  toDietPlanSummary,
} from "./diet-plans.mapper";

const RECIPE_INCLUDE = {
  ingredients: { include: { foodItem: { include: { nutrientData: true } } } },
};

const MEAL_ITEM_INCLUDE = {
  foodItem: { include: { nutrientData: true } },
  recipe: { include: RECIPE_INCLUDE },
};

const CLIENT_VISIBLE_STATUSES: Array<"ACTIVE" | "COMPLETED"> = ["ACTIVE", "COMPLETED"];

const PLAN_HIERARCHY_INCLUDE = {
  days: {
    orderBy: { dayNumber: "asc" as const },
    include: {
      meals: {
        orderBy: { createdAt: "asc" as const },
        include: {
          items: {
            include: MEAL_ITEM_INCLUDE,
          },
        },
      },
    },
  },
};

@Injectable()
export class DietPlansService {
  private readonly logger = new Logger(DietPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dietitianUserId: string, input: CreateDietPlanInput): Promise<DietPlanSummary> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    await this.assertClientLinked(dietitianProfile.id, input.clientId);

    const plan = await this.prisma.dietPlan.create({
      data: {
        clientId: input.clientId,
        dietitianId: dietitianProfile.id,
        title: input.title,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        targetCalories: input.targetCalories,
        targetProteinG: input.targetProteinG,
        targetCarbsG: input.targetCarbsG,
        targetFatG: input.targetFatG,
        status: "DRAFT",
      },
    });

    return toDietPlanSummary(plan);
  }

  async addDay(dietitianUserId: string, input: AddDietPlanDayInput): Promise<DietPlanDayView> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const plan = await this.prisma.dietPlan.findUnique({ where: { id: input.dietPlanId } });
    if (!plan) {
      throw new DietPlanNotFoundError();
    }
    if (plan.dietitianId !== dietitianProfile.id) {
      throw new DietPlanAccessDeniedError();
    }

    const day = await this.prisma.dietPlanDay.create({
      data: { dietPlanId: input.dietPlanId, dayNumber: input.dayNumber },
    });

    return { id: day.id, dayNumber: day.dayNumber, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
  }

  async addMeal(dietitianUserId: string, input: AddDietPlanMealInput): Promise<DietPlanMealView> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const day = await this.prisma.dietPlanDay.findUnique({
      where: { id: input.dietPlanDayId },
      include: { dietPlan: true },
    });
    if (!day) {
      throw new DietPlanDayNotFoundError();
    }
    if (day.dietPlan.dietitianId !== dietitianProfile.id) {
      throw new DietPlanAccessDeniedError();
    }

    const meal = await this.prisma.dietPlanMeal.create({
      data: {
        dietPlanDayId: input.dietPlanDayId,
        mealType: input.mealType,
        plannedTime: input.plannedTime ? new Date(`1970-01-01T${input.plannedTime}:00Z`) : undefined,
      },
    });

    return {
      id: meal.id,
      mealType: meal.mealType,
      plannedTime: input.plannedTime ?? null,
      items: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }

  async addMealItem(dietitianUserId: string, input: AddDietPlanMealItemInput): Promise<DietPlanMealItemView> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const meal = await this.prisma.dietPlanMeal.findUnique({
      where: { id: input.dietPlanMealId },
      include: { dietPlanDay: { include: { dietPlan: true } } },
    });
    if (!meal) {
      throw new DietPlanMealNotFoundError();
    }
    if (meal.dietPlanDay.dietPlan.dietitianId !== dietitianProfile.id) {
      throw new DietPlanAccessDeniedError();
    }

    if (input.recipeId) {
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: input.recipeId },
        include: RECIPE_INCLUDE,
      });
      if (!recipe) {
        throw new DietPlanRecipeNotFoundError();
      }
      const item = await this.prisma.dietPlanMealItem.create({
        data: {
          dietPlanMealId: input.dietPlanMealId,
          recipeId: input.recipeId,
          quantity: input.quantity,
          unit: input.unit,
        },
      });
      return buildMealItemView({ ...item, foodItem: null, recipe });
    }

    const foodItem = await this.prisma.foodItem.findUnique({
      where: { id: input.foodItemId },
      include: { nutrientData: true },
    });
    if (!foodItem || !foodItem.nutrientData) {
      throw new DietPlanFoodItemNotFoundError();
    }

    const item = await this.prisma.dietPlanMealItem.create({
      data: {
        dietPlanMealId: input.dietPlanMealId,
        foodItemId: input.foodItemId,
        quantity: input.quantity,
        unit: input.unit,
      },
    });

    return buildMealItemView({ ...item, foodItem, recipe: null });
  }

  // Miktar/birim güncellemesi hem taslakta hem gönderilmiş (ACTIVE) planda yapılabilir; kayıt silinmediği
  // için danışanın günlük işaretleri korunur. Tamamlanmış plan değiştirilemez.
  async updateMealItem(dietitianUserId: string, input: UpdateDietPlanMealItemInput): Promise<DietPlanMealItemView> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const item = await this.prisma.dietPlanMealItem.findUnique({
      where: { id: input.dietPlanMealItemId },
      include: { dietPlanMeal: { include: { dietPlanDay: { include: { dietPlan: true } } } } },
    });
    if (!item) {
      throw new DietPlanItemNotFoundError();
    }
    const plan = item.dietPlanMeal.dietPlanDay.dietPlan;
    if (plan.dietitianId !== dietitianProfile.id) {
      throw new DietPlanAccessDeniedError();
    }
    if (plan.status !== "DRAFT" && plan.status !== "ACTIVE") {
      throw new DietPlanCompletedError();
    }
    // Tarif kalemleri her zaman porsiyon cinsindendir.
    const unit = item.recipeId ? "PORTION" : input.unit;

    const updated = await this.prisma.dietPlanMealItem.update({
      where: { id: item.id },
      data: { quantity: input.quantity, unit },
      include: MEAL_ITEM_INCLUDE,
    });
    return buildMealItemView(updated);
  }

  async removeMealItem(dietitianUserId: string, itemId: string): Promise<void> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const item = await this.prisma.dietPlanMealItem.findUnique({
      where: { id: itemId },
      include: { dietPlanMeal: { include: { dietPlanDay: { include: { dietPlan: true } } } } },
    });
    if (!item) {
      throw new DietPlanItemNotFoundError();
    }
    this.assertDraftOwnedBy(item.dietPlanMeal.dietPlanDay.dietPlan, dietitianProfile.id);
    await this.prisma.dietPlanMealItem.delete({ where: { id: itemId } });
  }

  async removeMeal(dietitianUserId: string, mealId: string): Promise<void> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const meal = await this.prisma.dietPlanMeal.findUnique({
      where: { id: mealId },
      include: { dietPlanDay: { include: { dietPlan: true } } },
    });
    if (!meal) {
      throw new DietPlanMealNotFoundError();
    }
    this.assertDraftOwnedBy(meal.dietPlanDay.dietPlan, dietitianProfile.id);
    await this.prisma.dietPlanMeal.delete({ where: { id: mealId } });
  }

  async removeDay(dietitianUserId: string, dayId: string): Promise<void> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const day = await this.prisma.dietPlanDay.findUnique({ where: { id: dayId }, include: { dietPlan: true } });
    if (!day) {
      throw new DietPlanDayNotFoundError();
    }
    this.assertDraftOwnedBy(day.dietPlan, dietitianProfile.id);
    await this.prisma.dietPlanDay.delete({ where: { id: dayId } });
  }

  // Bir günü (öğünleri ve besinleriyle) planın sonuna yeni gün olarak kopyalar; haftalık
  // diyetlerde aynı günü tekrar tekrar elle girme ihtiyacını ortadan kaldırır.
  async copyDay(dietitianUserId: string, dayId: string): Promise<DietPlanDayView> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const day = await this.prisma.dietPlanDay.findUnique({
      where: { id: dayId },
      include: { dietPlan: true, meals: { orderBy: { createdAt: "asc" }, include: { items: true } } },
    });
    if (!day) {
      throw new DietPlanDayNotFoundError();
    }
    this.assertDraftOwnedBy(day.dietPlan, dietitianProfile.id);

    const newDayId = await this.prisma.$transaction(async (tx) => {
      const last = await tx.dietPlanDay.aggregate({
        where: { dietPlanId: day.dietPlanId },
        _max: { dayNumber: true },
      });
      const newDay = await tx.dietPlanDay.create({
        data: { dietPlanId: day.dietPlanId, dayNumber: (last._max.dayNumber ?? 0) + 1 },
      });
      for (const meal of day.meals) {
        const newMeal = await tx.dietPlanMeal.create({
          data: { dietPlanDayId: newDay.id, mealType: meal.mealType, plannedTime: meal.plannedTime },
        });
        for (const item of meal.items) {
          await tx.dietPlanMealItem.create({
            data: {
              dietPlanMealId: newMeal.id,
              foodItemId: item.foodItemId,
              recipeId: item.recipeId,
              quantity: item.quantity,
              unit: item.unit,
            },
          });
        }
      }
      return newDay.id;
    });

    const copied = await this.prisma.dietPlanDay.findUnique({
      where: { id: newDayId },
      include: PLAN_HIERARCHY_INCLUDE.days.include,
    });
    if (!copied) {
      throw new DietPlanDayNotFoundError();
    }
    return buildDayView(copied);
  }

  private assertDraftOwnedBy(plan: { dietitianId: string | null; status: string }, dietitianProfileId: string) {
    if (plan.dietitianId !== dietitianProfileId) {
      throw new DietPlanAccessDeniedError();
    }
    if (plan.status !== "DRAFT") {
      throw new DietPlanNotDraftError();
    }
  }

  async getById(userId: string, role: Role, dietPlanId: string): Promise<DietPlanDetail> {
    const plan = await this.loadPlanHierarchy(dietPlanId);
    if (!plan) {
      throw new DietPlanNotFoundError();
    }
    await this.assertCanViewPlan(userId, role, plan);
    return toDietPlanDetail(plan);
  }

  async list(userId: string, role: Role, clientId?: string): Promise<DietPlanSummary[]> {
    if (role === "CLIENT") {
      const profile = await this.prisma.clientProfile.findUnique({ where: { userId } });
      if (!profile) {
        throw new DietPlanAccessDeniedError();
      }
      // Danışan yalnızca kendisine gönderilmiş (ACTIVE) veya tamamlanmış planları görür;
      // diyetisyenin henüz göndermediği taslaklar (DRAFT) danışana görünmez.
      const plans = await this.prisma.dietPlan.findMany({
        where: { clientId: profile.id, status: { in: CLIENT_VISIBLE_STATUSES } },
        orderBy: { createdAt: "desc" },
      });
      return plans.map(toDietPlanSummary);
    }

    if (role === "DIETITIAN") {
      if (!clientId) {
        throw new MissingClientIdError();
      }
      const profile = await this.getOwnDietitianProfile(userId);
      const plans = await this.prisma.dietPlan.findMany({
        where: { clientId, dietitianId: profile.id },
        orderBy: { createdAt: "desc" },
      });
      return plans.map(toDietPlanSummary);
    }

    throw new DietPlanAccessDeniedError();
  }

  // Taslak (DRAFT) planı danışana gönderir: plan ACTIVE olur, danışanın "Diyetlerim" sayfasında
  // ve günlük takibinde görünür. Aynı diyetisyenin aynı danışana verdiği önceki aktif plan
  // tamamlanmış (COMPLETED) sayılır; böylece takip ekranında iki aktif plan çakışmaz.
  async send(dietitianUserId: string, dietPlanId: string): Promise<DietPlanSummary> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const plan = await this.loadPlanHierarchy(dietPlanId);
    if (!plan) {
      throw new DietPlanNotFoundError();
    }
    if (plan.dietitianId !== dietitianProfile.id) {
      throw new DietPlanAccessDeniedError();
    }
    await this.assertClientLinked(dietitianProfile.id, plan.clientId);
    if (plan.status !== "DRAFT") {
      throw new DietPlanNotDraftError();
    }
    if (!plan.days.some((day) => day.meals.some((meal) => meal.items.length > 0))) {
      throw new DietPlanHasNoItemsError();
    }

    const sent = await this.prisma.$transaction(async (tx) => {
      await tx.dietPlan.updateMany({
        where: { clientId: plan.clientId, dietitianId: dietitianProfile.id, status: "ACTIVE", id: { not: plan.id } },
        data: { status: "COMPLETED" },
      });
      return tx.dietPlan.update({ where: { id: plan.id }, data: { status: "ACTIVE" } });
    });

    // Bildirim best-effort: gönderilemese de plan zaten danışana ulaşmıştır.
    try {
      const client = await this.prisma.clientProfile.findUnique({ where: { id: plan.clientId } });
      if (client) {
        await this.notifications.create(client.userId, "DIET_PLAN_SENT", { dietPlanId: plan.id, title: plan.title });
      }
    } catch (error) {
      this.logger.warn(`Diyet planı bildirimi gönderilemedi (planId=${plan.id}): ${(error as Error).message}`);
    }

    return toDietPlanSummary(sent);
  }

  async duplicateForNewCalorieTarget(
    dietitianUserId: string,
    input: DuplicateForNewCalorieTargetInput,
  ): Promise<DietPlanDetail> {
    const dietitianProfile = await this.getOwnDietitianProfile(dietitianUserId);
    const original = await this.loadPlanHierarchy(input.dietPlanId);
    if (!original) {
      throw new DietPlanNotFoundError();
    }
    if (original.dietitianId !== dietitianProfile.id) {
      throw new DietPlanAccessDeniedError();
    }

    const originalDetail = toDietPlanDetail(original);
    if (originalDetail.totals.calories <= 0) {
      throw new EmptyDietPlanError();
    }
    const scaleFactor = input.newTargetCalories / originalDetail.totals.calories;

    const newPlanId = await this.prisma.$transaction(async (tx) => {
      const newPlan = await tx.dietPlan.create({
        data: {
          clientId: original.clientId,
          dietitianId: original.dietitianId,
          title: input.newTitle ?? `${original.title} (${input.newTargetCalories} kcal)`,
          startDate: original.startDate,
          endDate: original.endDate,
          targetCalories: input.newTargetCalories,
          targetProteinG: original.targetProteinG ? Number(original.targetProteinG) * scaleFactor : undefined,
          targetCarbsG: original.targetCarbsG ? Number(original.targetCarbsG) * scaleFactor : undefined,
          targetFatG: original.targetFatG ? Number(original.targetFatG) * scaleFactor : undefined,
          status: "DRAFT",
        },
      });

      for (const day of original.days) {
        const newDay = await tx.dietPlanDay.create({
          data: { dietPlanId: newPlan.id, dayNumber: day.dayNumber },
        });
        for (const meal of day.meals) {
          const newMeal = await tx.dietPlanMeal.create({
            data: {
              dietPlanDayId: newDay.id,
              mealType: meal.mealType,
              plannedTime: meal.plannedTime,
            },
          });
          for (const item of meal.items) {
            if (item.recipeId) {
              await tx.dietPlanMealItem.create({
                data: {
                  dietPlanMealId: newMeal.id,
                  recipeId: item.recipeId,
                  quantity: Number(item.quantity) * scaleFactor,
                  unit: item.unit,
                },
              });
              continue;
            }
            if (!item.foodItemId) continue;
            await tx.dietPlanMealItem.create({
              data: {
                dietPlanMealId: newMeal.id,
                foodItemId: item.foodItemId,
                quantity: Number(item.quantity) * scaleFactor,
                unit: item.unit,
              },
            });
          }
        }
      }

      return newPlan.id;
    });

    const newPlan = await this.loadPlanHierarchy(newPlanId);
    if (!newPlan) {
      throw new DietPlanNotFoundError();
    }
    return toDietPlanDetail(newPlan);
  }

  private async getOwnDietitianProfile(userId: string) {
    const profile = await this.prisma.dietitianProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new DietitianProfileNotFoundError();
    }
    return profile;
  }

  private async assertClientLinked(dietitianProfileId: string, clientId: string) {
    const link = await this.prisma.clientDietitianLink.findFirst({
      where: { dietitianId: dietitianProfileId, clientId, status: "ACTIVE" },
    });
    if (!link) {
      throw new ClientNotLinkedError();
    }
  }

  private async assertCanViewPlan(
    userId: string,
    role: Role,
    plan: { clientId: string; dietitianId: string | null; status: string },
  ) {
    if (role === "DIETITIAN") {
      const profile = await this.prisma.dietitianProfile.findUnique({ where: { userId } });
      if (!profile || plan.dietitianId !== profile.id) {
        throw new DietPlanAccessDeniedError();
      }
      return;
    }
    if (role === "CLIENT") {
      const profile = await this.prisma.clientProfile.findUnique({ where: { userId } });
      if (!profile || plan.clientId !== profile.id) {
        throw new DietPlanAccessDeniedError();
      }
      // Gönderilmemiş taslak, danışan için "yok" gibi davranır (varlığı bile sızdırılmaz).
      if (!(CLIENT_VISIBLE_STATUSES as string[]).includes(plan.status)) {
        throw new DietPlanNotFoundError();
      }
      return;
    }
    throw new DietPlanAccessDeniedError();
  }

  private async loadPlanHierarchy(dietPlanId: string): Promise<DietPlanWithHierarchy | null> {
    return this.prisma.dietPlan.findUnique({
      where: { id: dietPlanId },
      include: PLAN_HIERARCHY_INCLUDE,
    });
  }
}
