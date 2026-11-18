import {
  AddFoodEntryInputSchema,
  AddWaterInputSchema,
  SetMealItemStatusInputSchema,
  TrackingRangeInputSchema,
} from "./tracking";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("AddFoodEntryInputSchema", () => {
  const base = { logDate: "2026-03-01", mealType: "SNACK", quantity: 1, unit: "PIECE" };

  it("veritabanı besini ile geçerlidir", () => {
    expect(AddFoodEntryInputSchema.safeParse({ ...base, foodItemId: UUID }).success).toBe(true);
  });

  it("serbest isim + kalori ile geçerlidir", () => {
    expect(AddFoodEntryInputSchema.safeParse({ ...base, customName: "Börek", customCalories: 300 }).success).toBe(true);
  });

  it("hem besin hem serbest isim verilirse reddeder", () => {
    expect(
      AddFoodEntryInputSchema.safeParse({ ...base, foodItemId: UUID, customName: "Börek", customCalories: 1 }).success,
    ).toBe(false);
  });

  it("ikisi de yoksa reddeder", () => {
    expect(AddFoodEntryInputSchema.safeParse(base).success).toBe(false);
  });

  it("serbest girişte kalori yoksa reddeder", () => {
    expect(AddFoodEntryInputSchema.safeParse({ ...base, customName: "Börek" }).success).toBe(false);
  });

  it("boş string kalori (doldurulmamış form alanı) serbest girişte kalori yok sayılır", () => {
    expect(AddFoodEntryInputSchema.safeParse({ ...base, customName: "Börek", customCalories: "" }).success).toBe(false);
  });
});

describe("AddWaterInputSchema", () => {
  it("makul miktarı kabul eder", () => {
    expect(AddWaterInputSchema.safeParse({ logDate: "2026-03-01", amountMl: 250 }).success).toBe(true);
  });

  it("aşırı büyük veya çok küçük miktarı reddeder", () => {
    expect(AddWaterInputSchema.safeParse({ logDate: "2026-03-01", amountMl: 50000 }).success).toBe(false);
    expect(AddWaterInputSchema.safeParse({ logDate: "2026-03-01", amountMl: 1 }).success).toBe(false);
  });
});

describe("SetMealItemStatusInputSchema", () => {
  it("status null (geri alma) kabul edilir", () => {
    expect(
      SetMealItemStatusInputSchema.safeParse({ dietPlanMealItemId: UUID, logDate: "2026-03-01", status: null }).success,
    ).toBe(true);
  });

  it("bilinmeyen status reddedilir", () => {
    expect(
      SetMealItemStatusInputSchema.safeParse({ dietPlanMealItemId: UUID, logDate: "2026-03-01", status: "ATE" }).success,
    ).toBe(false);
  });
});

describe("TrackingRangeInputSchema", () => {
  it("ters aralığı reddeder", () => {
    expect(TrackingRangeInputSchema.safeParse({ clientId: UUID, from: "2026-03-10", to: "2026-03-01" }).success).toBe(
      false,
    );
  });

  it("93 günden uzun aralığı reddeder", () => {
    expect(TrackingRangeInputSchema.safeParse({ clientId: UUID, from: "2026-01-01", to: "2026-06-01" }).success).toBe(
      false,
    );
  });

  it("makul aralığı kabul eder", () => {
    expect(TrackingRangeInputSchema.safeParse({ clientId: UUID, from: "2026-03-01", to: "2026-03-31" }).success).toBe(
      true,
    );
  });
});
