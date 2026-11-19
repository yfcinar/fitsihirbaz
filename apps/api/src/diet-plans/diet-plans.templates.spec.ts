import { DietPlansService } from "./diet-plans.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { NotificationsService } from "../notifications/notifications.service";
import {
  ClientNotLinkedError,
  DietPlanAccessDeniedError,
  DietPlanCompletedError,
  DietPlanTemplateNotFoundError,
  EmptyDietPlanError,
} from "./diet-plans.errors";

const FOOD_A = "123e4567-e89b-12d3-a456-426614174001";
const FOOD_B = "123e4567-e89b-12d3-a456-426614174002";

const validContent = {
  days: [
    {
      dayNumber: 1,
      meals: [
        {
          mealType: "BREAKFAST",
          plannedTime: "08:00",
          note: "Aç karnına su iç",
          items: [
            { foodItemId: FOOD_A, recipeId: null, quantity: 100, unit: "GRAM" },
            { foodItemId: FOOD_B, recipeId: null, quantity: 50, unit: "GRAM" },
          ],
        },
      ],
    },
  ],
};

describe("DietPlansService — öğün saati/notu ve şablonlar", () => {
  let prisma: any;
  let service: DietPlansService;

  beforeEach(() => {
    prisma = {
      dietitianProfile: { findUnique: jest.fn().mockResolvedValue({ id: "dietitian-1" }) },
      clientDietitianLink: { findFirst: jest.fn().mockResolvedValue({ id: "link-1" }) },
      dietPlan: { findUnique: jest.fn() },
      dietPlanMeal: { findUnique: jest.fn(), update: jest.fn() },
      dietPlanTemplate: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      foodItem: { findMany: jest.fn() },
      recipe: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    service = new DietPlansService(prisma as PrismaService, { create: jest.fn() } as unknown as NotificationsService);
  });

  describe("updateMeal", () => {
    const mealRow = (status: string, dietitianId = "dietitian-1") => ({
      id: "meal-1",
      dietPlanDay: { dietPlan: { dietitianId, status } },
    });

    it("saat ve notu günceller; null ile temizler", async () => {
      prisma.dietPlanMeal.findUnique.mockResolvedValue(mealRow("DRAFT"));
      prisma.dietPlanMeal.update.mockResolvedValue({
        id: "meal-1",
        mealType: "LUNCH",
        plannedTime: new Date("1970-01-01T13:30:00Z"),
        note: "Tuzsuz",
        items: [],
      });

      const result = await service.updateMeal("user-1", { dietPlanMealId: "meal-1", plannedTime: "13:30", note: "Tuzsuz" });

      expect(prisma.dietPlanMeal.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { plannedTime: new Date("1970-01-01T13:30:00Z"), note: "Tuzsuz" } }),
      );
      expect(result.plannedTime).toBe("13:30");
      expect(result.note).toBe("Tuzsuz");

      await service.updateMeal("user-1", { dietPlanMealId: "meal-1", plannedTime: null, note: null });
      expect(prisma.dietPlanMeal.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { plannedTime: null, note: null } }),
      );
    });

    it("verilmeyen alana dokunmaz", async () => {
      prisma.dietPlanMeal.findUnique.mockResolvedValue(mealRow("ACTIVE"));
      prisma.dietPlanMeal.update.mockResolvedValue({ id: "meal-1", mealType: "LUNCH", plannedTime: null, note: "x", items: [] });
      await service.updateMeal("user-1", { dietPlanMealId: "meal-1", note: "x" });
      expect(prisma.dietPlanMeal.update).toHaveBeenCalledWith(expect.objectContaining({ data: { note: "x" } }));
    });

    it("tamamlanmış planı ve başkasının planını reddeder", async () => {
      prisma.dietPlanMeal.findUnique.mockResolvedValue(mealRow("COMPLETED"));
      await expect(service.updateMeal("user-1", { dietPlanMealId: "meal-1", note: "x" })).rejects.toBeInstanceOf(
        DietPlanCompletedError,
      );
      prisma.dietPlanMeal.findUnique.mockResolvedValue(mealRow("DRAFT", "baska"));
      await expect(service.updateMeal("user-1", { dietPlanMealId: "meal-1", note: "x" })).rejects.toBeInstanceOf(
        DietPlanAccessDeniedError,
      );
    });
  });

  describe("saveAsTemplate", () => {
    const planWithItem = {
      id: "plan-1",
      dietitianId: "dietitian-1",
      targetCalories: 1800,
      days: [
        {
          dayNumber: 1,
          meals: [
            {
              mealType: "BREAKFAST",
              plannedTime: new Date("1970-01-01T08:00:00Z"),
              note: "Not",
              items: [{ foodItemId: FOOD_A, recipeId: null, quantity: "100", unit: "GRAM" }],
            },
          ],
        },
      ],
    };

    it("plan yapısını (saat/not dahil) şablon olarak kaydeder", async () => {
      prisma.dietPlan.findUnique.mockResolvedValue(planWithItem);
      prisma.dietPlanTemplate.create.mockImplementation(async ({ data }: any) => ({
        id: "tpl-1",
        ...data,
        createdAt: new Date("2026-11-19"),
      }));

      const result = await service.saveAsTemplate("user-1", { dietPlanId: "plan-1", name: "Hafif 1800" });

      const saved = prisma.dietPlanTemplate.create.mock.calls[0][0].data;
      expect(saved.content.days[0].meals[0]).toEqual({
        mealType: "BREAKFAST",
        plannedTime: "08:00",
        note: "Not",
        items: [{ foodItemId: FOOD_A, recipeId: null, quantity: 100, unit: "GRAM" }],
      });
      expect(saved.targetCalories).toBe(1800);
      expect(result).toMatchObject({ id: "tpl-1", name: "Hafif 1800", dayCount: 1, itemCount: 1 });
    });

    it("boş planı şablon yapmayı ve başkasının planını reddeder", async () => {
      prisma.dietPlan.findUnique.mockResolvedValue({ ...planWithItem, days: [{ dayNumber: 1, meals: [] }] });
      await expect(service.saveAsTemplate("user-1", { dietPlanId: "plan-1", name: "x" })).rejects.toBeInstanceOf(
        EmptyDietPlanError,
      );
      prisma.dietPlan.findUnique.mockResolvedValue({ ...planWithItem, dietitianId: "baska" });
      await expect(service.saveAsTemplate("user-1", { dietPlanId: "plan-1", name: "x" })).rejects.toBeInstanceOf(
        DietPlanAccessDeniedError,
      );
    });
  });

  describe("applyTemplate", () => {
    const input = {
      templateId: "tpl-1",
      clientId: "client-1",
      title: "Deniz için plan",
      startDate: "2026-11-20",
    };

    it("şablondan taslak plan üretir, artık var olmayan besinleri atlar ve sayısını bildirir", async () => {
      prisma.dietPlanTemplate.findUnique.mockResolvedValue({
        id: "tpl-1",
        dietitianId: "dietitian-1",
        targetCalories: 1800,
        content: validContent,
      });
      prisma.foodItem.findMany.mockResolvedValue([{ id: FOOD_A }]); // FOOD_B silinmiş

      const tx = {
        dietPlan: {
          create: jest.fn().mockResolvedValue({
            id: "plan-new",
            clientId: "client-1",
            dietitianId: "dietitian-1",
            title: "Deniz için plan",
            startDate: new Date("2026-11-20"),
            endDate: null,
            targetCalories: 1800,
            targetProteinG: null,
            targetCarbsG: null,
            targetFatG: null,
            status: "DRAFT",
          }),
        },
        dietPlanDay: { create: jest.fn().mockResolvedValue({ id: "day-new" }) },
        dietPlanMeal: { create: jest.fn().mockResolvedValue({ id: "meal-new" }) },
        dietPlanMealItem: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));

      const result = await service.applyTemplate("user-1", input);

      expect(tx.dietPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: "DRAFT", clientId: "client-1", targetCalories: 1800 }),
      });
      expect(tx.dietPlanMeal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ note: "Aç karnına su iç", plannedTime: new Date("1970-01-01T08:00:00Z") }),
      });
      expect(tx.dietPlanMealItem.create).toHaveBeenCalledTimes(1);
      expect(result.skippedItems).toBe(1);
      expect(result.plan.status).toBe("DRAFT");
    });

    it("danışan bağlı değilse, şablon başkasınınsa veya içerik bozuksa reddeder", async () => {
      prisma.clientDietitianLink.findFirst.mockResolvedValue(null);
      await expect(service.applyTemplate("user-1", input)).rejects.toBeInstanceOf(ClientNotLinkedError);

      prisma.clientDietitianLink.findFirst.mockResolvedValue({ id: "link-1" });
      prisma.dietPlanTemplate.findUnique.mockResolvedValue({ id: "tpl-1", dietitianId: "baska", content: validContent });
      await expect(service.applyTemplate("user-1", input)).rejects.toBeInstanceOf(DietPlanAccessDeniedError);

      prisma.dietPlanTemplate.findUnique.mockResolvedValue({ id: "tpl-1", dietitianId: "dietitian-1", content: { days: "bozuk" } });
      await expect(service.applyTemplate("user-1", input)).rejects.toBeInstanceOf(DietPlanTemplateNotFoundError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("listTemplates / deleteTemplate", () => {
    it("yalnızca kendi şablonlarını listeler ve bozuk içeriği boş sayar", async () => {
      prisma.dietPlanTemplate.findMany.mockResolvedValue([
        { id: "a", name: "A", description: null, targetCalories: null, createdAt: new Date(), content: validContent },
        { id: "b", name: "B", description: null, targetCalories: null, createdAt: new Date(), content: "bozuk" },
      ]);
      const result = await service.listTemplates("user-1");
      expect(prisma.dietPlanTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { dietitianId: "dietitian-1" } }),
      );
      expect(result.map((t) => t.itemCount)).toEqual([2, 0]);
    });

    it("kendi şablonunu siler, başkasınınkini silemez", async () => {
      prisma.dietPlanTemplate.findUnique.mockResolvedValue({ id: "a", dietitianId: "dietitian-1" });
      await service.deleteTemplate("user-1", "a");
      expect(prisma.dietPlanTemplate.delete).toHaveBeenCalledWith({ where: { id: "a" } });

      prisma.dietPlanTemplate.findUnique.mockResolvedValue({ id: "a", dietitianId: "baska" });
      await expect(service.deleteTemplate("user-1", "a")).rejects.toBeInstanceOf(DietPlanAccessDeniedError);

      prisma.dietPlanTemplate.findUnique.mockResolvedValue(null);
      await expect(service.deleteTemplate("user-1", "yok")).rejects.toBeInstanceOf(DietPlanTemplateNotFoundError);
    });
  });
});
