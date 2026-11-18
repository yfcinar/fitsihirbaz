import { Injectable, Logger } from "@nestjs/common";
import type {
  AddDayCommentInput,
  AddFoodEntryInput,
  AddWaterInput,
  DayComment,
  FoodEntry,
  GetTrackingDayInput,
  Role,
  SetMealItemStatusInput,
  TrackingDay,
  TrackingDaySummary,
  TrackingRangeInput,
  WaterEntry,
} from "@fit-sihirbaz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { calculateItemNutrients } from "../diet-plans/diet-plans.calculator";
import {
  ClientProfileNotFoundError,
  DietitianProfileNotFoundError,
  EntryNotFoundError,
  FoodNotFoundError,
  FutureDateNotAllowedError,
  MealItemDateMismatchError,
  MealItemNotFoundError,
  MissingClientIdError,
  TrackingAccessDeniedError,
} from "./tracking.errors";
import {
  addDays,
  buildTrackingDay,
  planDayNumber,
  toDateString,
  toDayComment,
  toDaySummary,
  toFoodEntry,
  toWaterEntry,
  type TrackingPlanRow,
} from "./tracking.mapper";

const RECIPE_INCLUDE = {
  ingredients: { include: { foodItem: { include: { nutrientData: true } } } },
};

function planInclude(from: Date, to: Date) {
  return {
    days: {
      orderBy: { dayNumber: "asc" as const },
      include: {
        meals: {
          orderBy: { createdAt: "asc" as const },
          include: {
            items: {
              include: {
                foodItem: { include: { nutrientData: true } },
                recipe: { include: RECIPE_INCLUDE },
                logs: { where: { logDate: { gte: from, lte: to } } },
              },
            },
          },
        },
      },
    },
  };
}

const COMMENT_INCLUDE = { dietitian: { include: { user: true } } };

// Saat dilimi farkı yüzünden (Türkiye UTC+3) yerel "bugün", UTC'de "yarın" olabilir; bu yüzden
// en fazla bir gün ilerisine kadar kayda izin verilir.
const MAX_FUTURE_DAYS = 1;

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function assertNotFuture(date: Date): void {
  const today = parseDate(toDateString(new Date()));
  if (date.getTime() > addDays(today, MAX_FUTURE_DAYS).getTime()) {
    throw new FutureDateNotAllowedError();
  }
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---- Danışan: yazma ----

  async setMealItemStatus(clientUserId: string, input: SetMealItemStatusInput): Promise<{ success: true }> {
    const client = await this.getClientProfile(clientUserId);
    const item = await this.prisma.dietPlanMealItem.findUnique({
      where: { id: input.dietPlanMealItemId },
      include: { dietPlanMeal: { include: { dietPlanDay: { include: { dietPlan: true } } } } },
    });
    const day = item?.dietPlanMeal.dietPlanDay;
    const plan = day?.dietPlan;
    // Başkasının planı ya da henüz gönderilmemiş (DRAFT) plan danışana "yok" gibi davranır.
    if (!item || !day || !plan || plan.clientId !== client.id || plan.status !== "ACTIVE") {
      throw new MealItemNotFoundError();
    }

    const logDate = parseDate(input.logDate);
    assertNotFuture(logDate);
    // Plan günü ile tarih tutarlı olmalı: 3. günün öğünü 1. günün tarihine işaretlenemez.
    if (planDayNumber(plan.startDate, logDate) !== day.dayNumber) {
      throw new MealItemDateMismatchError();
    }

    if (input.status === null) {
      await this.prisma.mealItemLog.deleteMany({
        where: { clientId: client.id, dietPlanMealItemId: item.id, logDate },
      });
      return { success: true };
    }

    await this.prisma.mealItemLog.upsert({
      where: { dietPlanMealItemId_logDate: { dietPlanMealItemId: item.id, logDate } },
      create: {
        clientId: client.id,
        dietPlanMealItemId: item.id,
        logDate,
        status: input.status,
        note: input.note,
      },
      update: { status: input.status, note: input.note ?? null },
    });
    return { success: true };
  }

  async addFoodEntry(clientUserId: string, input: AddFoodEntryInput): Promise<FoodEntry> {
    const client = await this.getClientProfile(clientUserId);
    const logDate = parseDate(input.logDate);
    assertNotFuture(logDate);

    let nutrients = {
      calories: input.customCalories ?? 0,
      protein: input.customProtein ?? 0,
      carbs: input.customCarbs ?? 0,
      fat: input.customFat ?? 0,
    };
    if (input.foodItemId) {
      const food = await this.prisma.foodItem.findUnique({
        where: { id: input.foodItemId },
        include: { nutrientData: true },
      });
      if (!food || !food.nutrientData) {
        throw new FoodNotFoundError();
      }
      nutrients = calculateItemNutrients({
        caloriesPer100g: Number(food.nutrientData.calories),
        proteinPer100g: Number(food.nutrientData.protein),
        carbsPer100g: Number(food.nutrientData.carbs),
        fatPer100g: Number(food.nutrientData.fat),
        servingGramWeight: food.servingGramWeight === null ? null : Number(food.servingGramWeight),
        quantity: input.quantity,
        unit: input.unit,
      });
    }

    const row = await this.prisma.foodLogEntry.create({
      data: {
        clientId: client.id,
        logDate,
        mealType: input.mealType,
        foodItemId: input.foodItemId,
        customName: input.customName,
        quantity: input.quantity,
        unit: input.unit,
        ...nutrients,
      },
      include: { foodItem: { select: { name: true } } },
    });
    return toFoodEntry(row);
  }

  async deleteFoodEntry(clientUserId: string, id: string): Promise<{ success: true }> {
    const client = await this.getClientProfile(clientUserId);
    const result = await this.prisma.foodLogEntry.deleteMany({ where: { id, clientId: client.id } });
    if (result.count === 0) {
      throw new EntryNotFoundError();
    }
    return { success: true };
  }

  async addWater(clientUserId: string, input: AddWaterInput): Promise<WaterEntry> {
    const client = await this.getClientProfile(clientUserId);
    const logDate = parseDate(input.logDate);
    assertNotFuture(logDate);
    const row = await this.prisma.waterLog.create({
      data: { clientId: client.id, logDate, amountMl: input.amountMl },
    });
    return toWaterEntry(row);
  }

  async deleteWater(clientUserId: string, id: string): Promise<{ success: true }> {
    const client = await this.getClientProfile(clientUserId);
    const result = await this.prisma.waterLog.deleteMany({ where: { id, clientId: client.id } });
    if (result.count === 0) {
      throw new EntryNotFoundError();
    }
    return { success: true };
  }

  // ---- Okuma (danışan kendi günü, diyetisyen bağlı olduğu danışanın günü) ----

  async getDay(userId: string, role: Role, input: GetTrackingDayInput): Promise<TrackingDay> {
    const { clientId, dietitianId } = await this.resolveViewer(userId, role, input.clientId);
    const date = parseDate(input.date);
    const days = await this.loadDays(clientId, date, date, dietitianId);
    return days[0];
  }

  async getRange(dietitianUserId: string, input: TrackingRangeInput): Promise<TrackingDaySummary[]> {
    const { clientId, dietitianId } = await this.resolveViewer(dietitianUserId, "DIETITIAN", input.clientId);
    const days = await this.loadDays(clientId, parseDate(input.from), parseDate(input.to), dietitianId);
    return days.map(toDaySummary);
  }

  async addComment(dietitianUserId: string, input: AddDayCommentInput): Promise<DayComment> {
    const { clientId, dietitianId } = await this.resolveViewer(dietitianUserId, "DIETITIAN", input.clientId);
    const row = await this.prisma.dayComment.create({
      data: {
        clientId,
        dietitianId: dietitianId as string,
        logDate: parseDate(input.logDate),
        body: input.body,
      },
      include: COMMENT_INCLUDE,
    });

    // Bildirim best-effort: gönderilemese de yorum kaydedilmiştir.
    try {
      const client = await this.prisma.clientProfile.findUnique({ where: { id: clientId } });
      if (client) {
        await this.notifications.create(client.userId, "DAY_COMMENT", {
          logDate: input.logDate,
          preview: input.body.slice(0, 80),
        });
      }
    } catch (error) {
      this.logger.warn(`Yorum bildirimi gönderilemedi: ${(error as Error).message}`);
    }

    return toDayComment(row);
  }

  // ---- Yardımcılar ----

  // [from, to] aralığındaki her gün için bir TrackingDay üretir; tüm veri tek seferde çekilir.
  private async loadDays(clientId: string, from: Date, to: Date, dietitianId?: string): Promise<TrackingDay[]> {
    const [plans, foodEntries, waterLogs, comments] = await Promise.all([
      this.prisma.dietPlan.findMany({
        where: {
          clientId,
          status: "ACTIVE",
          startDate: { lte: to },
          OR: [{ endDate: null }, { endDate: { gte: from } }],
          // Diyetisyen yalnızca kendi yazdığı planları görür.
          ...(dietitianId ? { dietitianId } : {}),
        },
        include: planInclude(from, to),
      }),
      this.prisma.foodLogEntry.findMany({
        where: { clientId, logDate: { gte: from, lte: to } },
        include: { foodItem: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.waterLog.findMany({
        where: { clientId, logDate: { gte: from, lte: to } },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.dayComment.findMany({
        where: { clientId, logDate: { gte: from, lte: to }, ...(dietitianId ? { dietitianId } : {}) },
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const days: TrackingDay[] = [];
    for (let cursor = from; cursor.getTime() <= to.getTime(); cursor = addDays(cursor, 1)) {
      days.push(
        buildTrackingDay({
          date: cursor,
          plans: plans as unknown as TrackingPlanRow[],
          foodEntries,
          waterLogs,
          comments,
        }),
      );
    }
    return days;
  }

  private async resolveViewer(
    userId: string,
    role: Role,
    clientId?: string,
  ): Promise<{ clientId: string; dietitianId?: string }> {
    if (role === "CLIENT") {
      const profile = await this.getClientProfile(userId);
      return { clientId: profile.id };
    }
    if (role !== "DIETITIAN") {
      throw new TrackingAccessDeniedError();
    }
    if (!clientId) {
      throw new MissingClientIdError();
    }
    const dietitian = await this.prisma.dietitianProfile.findUnique({ where: { userId } });
    if (!dietitian) {
      throw new DietitianProfileNotFoundError();
    }
    const link = await this.prisma.clientDietitianLink.findFirst({
      where: { dietitianId: dietitian.id, clientId, status: "ACTIVE" },
    });
    if (!link) {
      throw new TrackingAccessDeniedError();
    }
    return { clientId, dietitianId: dietitian.id };
  }

  private async getClientProfile(userId: string) {
    const profile = await this.prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ClientProfileNotFoundError();
    }
    return profile;
  }
}
