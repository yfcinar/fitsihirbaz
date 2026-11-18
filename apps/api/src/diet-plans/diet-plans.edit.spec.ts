import { DietPlansService } from "./diet-plans.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { NotificationsService } from "../notifications/notifications.service";
import {
  DietPlanAccessDeniedError,
  DietPlanCompletedError,
  DietPlanDayNotFoundError,
  DietPlanItemNotFoundError,
  DietPlanNotDraftError,
} from "./diet-plans.errors";

const food = {
  id: "food-1",
  name: "Elma",
  servingGramWeight: "182",
  nutrientData: { calories: "52", protein: "0.3", carbs: "13.8", fat: "0.2" },
};

function itemRow(planOverrides: Record<string, unknown> = {}, itemOverrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    foodItemId: "food-1",
    recipeId: null,
    quantity: "100",
    unit: "GRAM",
    foodItem: food,
    recipe: null,
    dietPlanMeal: {
      id: "meal-1",
      dietPlanDay: { id: "day-1", dietPlan: { id: "plan-1", dietitianId: "dietitian-1", status: "DRAFT", ...planOverrides } },
    },
    ...itemOverrides,
  };
}

describe("DietPlansService — plan düzenleme", () => {
  let prisma: {
    dietitianProfile: { findUnique: jest.Mock };
    dietPlanDay: { findUnique: jest.Mock; delete: jest.Mock };
    dietPlanMeal: { findUnique: jest.Mock; delete: jest.Mock };
    dietPlanMealItem: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: DietPlansService;

  beforeEach(() => {
    prisma = {
      dietitianProfile: { findUnique: jest.fn().mockResolvedValue({ id: "dietitian-1" }) },
      dietPlanDay: { findUnique: jest.fn(), delete: jest.fn() },
      dietPlanMeal: { findUnique: jest.fn(), delete: jest.fn() },
      dietPlanMealItem: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new DietPlansService(prisma as unknown as PrismaService, { create: jest.fn() } as unknown as NotificationsService);
  });

  describe("updateMealItem", () => {
    it("taslakta miktarı günceller", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow());
      prisma.dietPlanMealItem.update.mockResolvedValue({ ...itemRow(), quantity: "150" });

      const result = await service.updateMealItem("user-1", { dietPlanMealItemId: "item-1", quantity: 150, unit: "GRAM" });

      expect(prisma.dietPlanMealItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 150, unit: "GRAM" } }),
      );
      expect(result.quantity).toBe(150);
    });

    it("gönderilmiş (ACTIVE) planda da miktar güncellenebilir", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ status: "ACTIVE" }));
      prisma.dietPlanMealItem.update.mockResolvedValue(itemRow({ status: "ACTIVE" }));
      await expect(
        service.updateMealItem("user-1", { dietPlanMealItemId: "item-1", quantity: 80, unit: "GRAM" }),
      ).resolves.toBeDefined();
    });

    it("tamamlanmış planı değiştirmeyi reddeder", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ status: "COMPLETED" }));
      await expect(
        service.updateMealItem("user-1", { dietPlanMealItemId: "item-1", quantity: 80, unit: "GRAM" }),
      ).rejects.toBeInstanceOf(DietPlanCompletedError);
    });

    it("başka diyetisyenin planını değiştirmeyi reddeder", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ dietitianId: "baska" }));
      await expect(
        service.updateMealItem("user-1", { dietPlanMealItemId: "item-1", quantity: 80, unit: "GRAM" }),
      ).rejects.toBeInstanceOf(DietPlanAccessDeniedError);
    });

    it("olmayan kalemde hata verir", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(null);
      await expect(
        service.updateMealItem("user-1", { dietPlanMealItemId: "yok", quantity: 80, unit: "GRAM" }),
      ).rejects.toBeInstanceOf(DietPlanItemNotFoundError);
    });
  });

  describe("silme", () => {
    it("taslaktaki kalemi siler", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow());
      await service.removeMealItem("user-1", "item-1");
      expect(prisma.dietPlanMealItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    });

    it("gönderilmiş plandan kalem silmeyi reddeder (danışan günlüğü silinirdi)", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ status: "ACTIVE" }));
      await expect(service.removeMealItem("user-1", "item-1")).rejects.toBeInstanceOf(DietPlanNotDraftError);
      expect(prisma.dietPlanMealItem.delete).not.toHaveBeenCalled();
    });

    it("başka diyetisyenin kalemini silmeyi reddeder", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ dietitianId: "baska" }));
      await expect(service.removeMealItem("user-1", "item-1")).rejects.toBeInstanceOf(DietPlanAccessDeniedError);
    });

    it("taslaktaki öğünü ve günü siler, gönderilmişte reddeder", async () => {
      const draftMealDay = { id: "day-1", dietPlan: { dietitianId: "dietitian-1", status: "DRAFT" } };
      prisma.dietPlanMeal.findUnique.mockResolvedValue({ id: "meal-1", dietPlanDay: draftMealDay });
      await service.removeMeal("user-1", "meal-1");
      expect(prisma.dietPlanMeal.delete).toHaveBeenCalledWith({ where: { id: "meal-1" } });

      prisma.dietPlanDay.findUnique.mockResolvedValue({ id: "day-1", dietPlan: { dietitianId: "dietitian-1", status: "DRAFT" } });
      await service.removeDay("user-1", "day-1");
      expect(prisma.dietPlanDay.delete).toHaveBeenCalledWith({ where: { id: "day-1" } });

      prisma.dietPlanDay.findUnique.mockResolvedValue({ id: "day-1", dietPlan: { dietitianId: "dietitian-1", status: "ACTIVE" } });
      await expect(service.removeDay("user-1", "day-1")).rejects.toBeInstanceOf(DietPlanNotDraftError);
    });

    it("olmayan günde hata verir", async () => {
      prisma.dietPlanDay.findUnique.mockResolvedValue(null);
      await expect(service.removeDay("user-1", "yok")).rejects.toBeInstanceOf(DietPlanDayNotFoundError);
    });
  });

  describe("copyDay", () => {
    const sourceDay = {
      id: "day-1",
      dietPlanId: "plan-1",
      dietPlan: { dietitianId: "dietitian-1", status: "DRAFT" },
      meals: [
        {
          mealType: "BREAKFAST",
          plannedTime: null,
          items: [{ foodItemId: "food-1", recipeId: null, quantity: "100", unit: "GRAM" }],
        },
      ],
    };

    it("günü öğünleri ve besinleriyle planın sonuna kopyalar", async () => {
      const tx = {
        dietPlanDay: {
          aggregate: jest.fn().mockResolvedValue({ _max: { dayNumber: 3 } }),
          create: jest.fn().mockResolvedValue({ id: "day-new" }),
        },
        dietPlanMeal: { create: jest.fn().mockResolvedValue({ id: "meal-new" }) },
        dietPlanMealItem: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));
      prisma.dietPlanDay.findUnique
        .mockResolvedValueOnce(sourceDay)
        .mockResolvedValueOnce({ id: "day-new", dayNumber: 4, meals: [] });

      const result = await service.copyDay("user-1", "day-1");

      expect(tx.dietPlanDay.create).toHaveBeenCalledWith({ data: { dietPlanId: "plan-1", dayNumber: 4 } });
      expect(tx.dietPlanMealItem.create).toHaveBeenCalledWith({
        data: { dietPlanMealId: "meal-new", foodItemId: "food-1", recipeId: null, quantity: "100", unit: "GRAM" },
      });
      expect(result.dayNumber).toBe(4);
    });

    it("gönderilmiş plana gün kopyalamayı reddeder", async () => {
      prisma.dietPlanDay.findUnique.mockResolvedValue({ ...sourceDay, dietPlan: { dietitianId: "dietitian-1", status: "ACTIVE" } });
      await expect(service.copyDay("user-1", "day-1")).rejects.toBeInstanceOf(DietPlanNotDraftError);
    });
  });
});
