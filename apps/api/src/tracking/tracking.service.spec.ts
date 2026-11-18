import { PrismaService } from "../prisma/prisma.service";
import { TrackingService } from "./tracking.service";
import {
  EntryNotFoundError,
  FoodNotFoundError,
  FutureDateNotAllowedError,
  MealItemDateMismatchError,
  MealItemNotFoundError,
  MissingClientIdError,
  TrackingAccessDeniedError,
} from "./tracking.errors";

const CLIENT = { id: "client-1", userId: "user-client" };
const DIETITIAN = { id: "dietitian-1", userId: "user-dietitian" };

function todayString(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function itemRow(overrides: { plan?: Record<string, unknown>; dayNumber?: number } = {}) {
  return {
    id: "item-1",
    dietPlanMeal: {
      dietPlanDay: {
        dayNumber: overrides.dayNumber ?? 1,
        dietPlan: {
          id: "plan-1",
          clientId: CLIENT.id,
          status: "ACTIVE",
          startDate: new Date(`${todayString()}T00:00:00.000Z`),
          ...overrides.plan,
        },
      },
    },
  };
}

describe("TrackingService", () => {
  let prisma: {
    clientProfile: { findUnique: jest.Mock };
    dietitianProfile: { findUnique: jest.Mock };
    clientDietitianLink: { findFirst: jest.Mock };
    dietPlanMealItem: { findUnique: jest.Mock };
    dietPlan: { findMany: jest.Mock };
    mealItemLog: { upsert: jest.Mock; deleteMany: jest.Mock };
    foodItem: { findUnique: jest.Mock };
    foodLogEntry: { create: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
    waterLog: { create: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
    dayComment: { create: jest.Mock; findMany: jest.Mock };
  };
  let service: TrackingService;

  beforeEach(() => {
    prisma = {
      clientProfile: { findUnique: jest.fn().mockResolvedValue(CLIENT) },
      dietitianProfile: { findUnique: jest.fn().mockResolvedValue(DIETITIAN) },
      clientDietitianLink: { findFirst: jest.fn().mockResolvedValue({ id: "link-1" }) },
      dietPlanMealItem: { findUnique: jest.fn() },
      dietPlan: { findMany: jest.fn().mockResolvedValue([]) },
      mealItemLog: { upsert: jest.fn(), deleteMany: jest.fn() },
      foodItem: { findUnique: jest.fn() },
      foodLogEntry: { create: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      waterLog: { create: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      dayComment: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new TrackingService(prisma as unknown as PrismaService);
  });

  describe("setMealItemStatus", () => {
    const input = { dietPlanMealItemId: "item-1", logDate: todayString(), status: "EATEN" as const };

    it("kalem bulunamazsa MealItemNotFoundError fırlatır", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(null);
      await expect(service.setMealItemStatus(CLIENT.userId, input)).rejects.toBeInstanceOf(MealItemNotFoundError);
    });

    it("başka danışanın planındaki kalemi 'yok' gibi gösterir", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ plan: { clientId: "baska-danisan" } }));
      await expect(service.setMealItemStatus(CLIENT.userId, input)).rejects.toBeInstanceOf(MealItemNotFoundError);
      expect(prisma.mealItemLog.upsert).not.toHaveBeenCalled();
    });

    it("gönderilmemiş (DRAFT) plandaki kalemi işaretlemeye izin vermez", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ plan: { status: "DRAFT" } }));
      await expect(service.setMealItemStatus(CLIENT.userId, input)).rejects.toBeInstanceOf(MealItemNotFoundError);
    });

    it("plan gününe uymayan tarihi reddeder", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow({ dayNumber: 3 }));
      await expect(service.setMealItemStatus(CLIENT.userId, input)).rejects.toBeInstanceOf(
        MealItemDateMismatchError,
      );
    });

    it("birden fazla gün ilerisini reddeder", async () => {
      const future = todayString(5);
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(
        itemRow({ plan: { startDate: new Date(`${future}T00:00:00.000Z`) } }),
      );
      await expect(service.setMealItemStatus(CLIENT.userId, { ...input, logDate: future })).rejects.toBeInstanceOf(
        FutureDateNotAllowedError,
      );
    });

    it("geçerli işareti upsert eder", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow());
      await service.setMealItemStatus(CLIENT.userId, { ...input, note: "az yedim" });
      expect(prisma.mealItemLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ clientId: CLIENT.id, status: "EATEN", note: "az yedim" }),
        }),
      );
    });

    it("status null ise işareti siler", async () => {
      prisma.dietPlanMealItem.findUnique.mockResolvedValue(itemRow());
      await service.setMealItemStatus(CLIENT.userId, { ...input, status: null });
      expect(prisma.mealItemLog.deleteMany).toHaveBeenCalled();
      expect(prisma.mealItemLog.upsert).not.toHaveBeenCalled();
    });
  });

  describe("addFoodEntry", () => {
    it("veritabanı besini için besin değerlerini 100 g üzerinden hesaplar", async () => {
      prisma.foodItem.findUnique.mockResolvedValue({
        id: "food-1",
        servingGramWeight: null,
        nutrientData: { calories: 200, protein: 10, carbs: 20, fat: 5 },
      });
      prisma.foodLogEntry.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "e1",
        ...data,
        foodItem: { name: "Yulaf" },
      }));

      const result = await service.addFoodEntry(CLIENT.userId, {
        logDate: todayString(),
        mealType: "SNACK",
        foodItemId: "11111111-1111-1111-1111-111111111111",
        quantity: 50,
        unit: "GRAM",
      });

      expect(result.calories).toBe(100);
      expect(result.name).toBe("Yulaf");
    });

    it("olmayan besin için FoodNotFoundError fırlatır", async () => {
      prisma.foodItem.findUnique.mockResolvedValue(null);
      await expect(
        service.addFoodEntry(CLIENT.userId, {
          logDate: todayString(),
          mealType: "SNACK",
          foodItemId: "11111111-1111-1111-1111-111111111111",
          quantity: 1,
          unit: "PIECE",
        }),
      ).rejects.toBeInstanceOf(FoodNotFoundError);
    });

    it("serbest girişte danışanın verdiği besin değerlerini aynen saklar", async () => {
      prisma.foodLogEntry.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "e2",
        ...data,
        foodItem: null,
      }));

      const result = await service.addFoodEntry(CLIENT.userId, {
        logDate: todayString(),
        mealType: "DINNER",
        customName: "Ev yapımı börek",
        quantity: 1,
        unit: "PORTION",
        customCalories: 320,
      });

      expect(result).toMatchObject({ name: "Ev yapımı börek", calories: 320, protein: 0 });
    });
  });

  describe("silme", () => {
    it("başkasına ait besin kaydı silinemez (kayıt yok gibi davranır)", async () => {
      prisma.foodLogEntry.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.deleteFoodEntry(CLIENT.userId, "e1")).rejects.toBeInstanceOf(EntryNotFoundError);
      expect(prisma.foodLogEntry.deleteMany).toHaveBeenCalledWith({ where: { id: "e1", clientId: CLIENT.id } });
    });

    it("kendi su kaydını siler", async () => {
      prisma.waterLog.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.deleteWater(CLIENT.userId, "w1")).resolves.toEqual({ success: true });
    });
  });

  describe("okuma erişimi", () => {
    it("diyetisyen clientId vermezse MissingClientIdError fırlatır", async () => {
      await expect(
        service.getDay(DIETITIAN.userId, "DIETITIAN", { date: todayString() }),
      ).rejects.toBeInstanceOf(MissingClientIdError);
    });

    it("danışanına bağlı olmayan diyetisyen erişemez", async () => {
      prisma.clientDietitianLink.findFirst.mockResolvedValue(null);
      await expect(
        service.getDay(DIETITIAN.userId, "DIETITIAN", { date: todayString(), clientId: CLIENT.id }),
      ).rejects.toBeInstanceOf(TrackingAccessDeniedError);
    });

    it("admin gün verisine erişemez", async () => {
      await expect(
        service.getDay("admin", "ADMIN", { date: todayString(), clientId: CLIENT.id }),
      ).rejects.toBeInstanceOf(TrackingAccessDeniedError);
    });

    it("diyetisyen için planlar ve yorumlar kendi kimliğine göre filtrelenir", async () => {
      await service.getDay(DIETITIAN.userId, "DIETITIAN", { date: todayString(), clientId: CLIENT.id });

      expect(prisma.dietPlan.findMany.mock.calls[0][0].where).toMatchObject({
        clientId: CLIENT.id,
        status: "ACTIVE",
        dietitianId: DIETITIAN.id,
      });
      expect(prisma.dayComment.findMany.mock.calls[0][0].where).toMatchObject({ dietitianId: DIETITIAN.id });
    });

    it("danışan kendi günü için diyetisyen filtresi uygulanmaz ve clientId girdisi yok sayılır", async () => {
      await service.getDay(CLIENT.userId, "CLIENT", { date: todayString(), clientId: "baska-danisan" });

      expect(prisma.dietPlan.findMany.mock.calls[0][0].where).not.toHaveProperty("dietitianId");
      expect(prisma.dietPlan.findMany.mock.calls[0][0].where.clientId).toBe(CLIENT.id);
    });

    it("aralık özeti her gün için bir satır döner", async () => {
      const result = await service.getRange(DIETITIAN.userId, {
        clientId: CLIENT.id,
        from: "2026-03-01",
        to: "2026-03-07",
      });
      expect(result).toHaveLength(7);
    });
  });

  describe("addComment", () => {
    it("bağlı diyetisyen yorum ekler", async () => {
      prisma.dayComment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "c1",
        createdAt: new Date(),
        ...data,
        dietitian: { user: { firstName: "Ayşe", lastName: "Yılmaz" } },
      }));

      const result = await service.addComment(DIETITIAN.userId, {
        clientId: CLIENT.id,
        logDate: "2026-03-01",
        body: "Harika gidiyorsun",
      });

      expect(result.body).toBe("Harika gidiyorsun");
      expect(prisma.dayComment.create.mock.calls[0][0].data.dietitianId).toBe(DIETITIAN.id);
    });

    it("bağlı olmayan diyetisyen yorum ekleyemez", async () => {
      prisma.clientDietitianLink.findFirst.mockResolvedValue(null);
      await expect(
        service.addComment(DIETITIAN.userId, { clientId: CLIENT.id, logDate: "2026-03-01", body: "x" }),
      ).rejects.toBeInstanceOf(TrackingAccessDeniedError);
      expect(prisma.dayComment.create).not.toHaveBeenCalled();
    });
  });
});
