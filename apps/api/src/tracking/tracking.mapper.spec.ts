import { addDays, buildAdherence, buildTrackingDay, planDayNumber, toDaySummary, type TrackingPlanRow } from "./tracking.mapper";

const START = new Date("2026-03-01T00:00:00.000Z");

function food(name: string, caloriesPer100g: number) {
  return {
    id: `food-${name}`,
    name,
    servingGramWeight: null,
    nutrientData: { calories: caloriesPer100g, protein: 10, carbs: 20, fat: 5 },
  };
}

function item(id: string, name: string, caloriesPer100g: number, logs: Array<Record<string, unknown>> = []) {
  return { id, foodItem: food(name, caloriesPer100g), recipe: null, quantity: 100, unit: "GRAM", logs };
}

function plan(overrides: Record<string, unknown> = {}): TrackingPlanRow {
  return {
    id: "plan-1",
    title: "Kilo verme",
    startDate: START,
    days: [
      {
        id: "day-1",
        dayNumber: 1,
        meals: [
          { id: "meal-1", mealType: "BREAKFAST", items: [item("i1", "Yulaf", 400), item("i2", "Süt", 60)] },
          { id: "meal-2", mealType: "LUNCH", items: [item("i3", "Tavuk", 165)] },
        ],
      },
      {
        id: "day-2",
        dayNumber: 2,
        meals: [{ id: "meal-3", mealType: "BREAKFAST", items: [item("i4", "Yumurta", 150)] }],
      },
    ],
    ...overrides,
  } as unknown as TrackingPlanRow;
}

describe("planDayNumber", () => {
  it("başlangıç tarihini 1. gün sayar", () => {
    expect(planDayNumber(START, START)).toBe(1);
    expect(planDayNumber(START, addDays(START, 2))).toBe(3);
  });
});

describe("buildAdherence", () => {
  it("kalem yoksa yüzde null döner", () => {
    expect(buildAdherence([]).adherencePercent).toBeNull();
  });

  it("yenen 1, kısmen 0.5, yenmeyen 0 ve işaretlenmemiş 0 sayılır", () => {
    const result = buildAdherence(["EATEN", "PARTIAL", "SKIPPED", null]);
    expect(result).toEqual({
      plannedCount: 4,
      eatenCount: 1,
      partialCount: 1,
      skippedCount: 1,
      adherencePercent: 38,
    });
  });
});

describe("buildTrackingDay", () => {
  const empty = { foodEntries: [], waterLogs: [], comments: [] };

  it("tarihe karşılık gelen plan gününün kalemlerini döner", () => {
    const day = buildTrackingDay({ date: addDays(START, 1), plans: [plan()], ...empty });
    expect(day.plannedItems.map((entry) => entry.name)).toEqual(["Yumurta"]);
  });

  it("planda olmayan bir gün için boş liste ve null uyum döner", () => {
    const day = buildTrackingDay({ date: addDays(START, 10), plans: [plan()], ...empty });
    expect(day.plannedItems).toEqual([]);
    expect(day.adherence.adherencePercent).toBeNull();
  });

  it("yalnızca işaretlenen kalemlerin kalorisini ağırlığıyla toplar", () => {
    const logDate = START;
    const withLogs = plan({
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          meals: [
            {
              id: "meal-1",
              mealType: "BREAKFAST",
              items: [
                item("i1", "Yulaf", 400, [{ logDate, status: "EATEN", note: null }]),
                item("i2", "Süt", 60, [{ logDate, status: "PARTIAL", note: "yarısı" }]),
                item("i3", "Tavuk", 165, [{ logDate, status: "SKIPPED", note: null }]),
                item("i5", "Elma", 52, []),
              ],
            },
          ],
        },
      ],
    });

    const day = buildTrackingDay({ date: START, plans: [withLogs], ...empty });

    // 400 (yenen) + 60 * 0.5 (kısmen) = 430
    expect(day.consumed.calories).toBe(430);
    expect(day.adherence).toMatchObject({ plannedCount: 4, eatenCount: 1, partialCount: 1, skippedCount: 1 });
    expect(day.plannedItems.find((entry) => entry.name === "Süt")?.note).toBe("yarısı");
  });

  it("başka güne ait log'u yok sayar", () => {
    const withLogs = plan({
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          meals: [
            {
              id: "meal-1",
              mealType: "BREAKFAST",
              items: [item("i1", "Yulaf", 400, [{ logDate: addDays(START, 5), status: "EATEN", note: null }])],
            },
          ],
        },
      ],
    });
    const day = buildTrackingDay({ date: START, plans: [withLogs], ...empty });
    expect(day.plannedItems[0].status).toBeNull();
    expect(day.consumed.calories).toBe(0);
  });

  it("su, plan dışı besin ve yorumu sadece ilgili gün için toplar", () => {
    const day = buildTrackingDay({
      date: START,
      plans: [],
      foodEntries: [
        { id: "f1", logDate: START, mealType: "SNACK", foodItem: null, customName: "Börek", quantity: 1, unit: "PIECE", calories: 300, protein: 8, carbs: 30, fat: 15 },
        { id: "f2", logDate: addDays(START, 1), mealType: "SNACK", foodItem: null, customName: "Başka gün", quantity: 1, unit: "PIECE", calories: 999, protein: 0, carbs: 0, fat: 0 },
      ] as never,
      waterLogs: [
        { id: "w1", logDate: START, amountMl: 250, createdAt: new Date() },
        { id: "w2", logDate: START, amountMl: 500, createdAt: new Date() },
        { id: "w3", logDate: addDays(START, 1), amountMl: 1000, createdAt: new Date() },
      ] as never,
      comments: [
        { id: "c1", logDate: START, dietitianId: "d1", body: "Aferin", createdAt: new Date(), dietitian: { user: { firstName: "Ayşe", lastName: "Yılmaz" } } },
      ] as never,
    });

    expect(day.waterTotalMl).toBe(750);
    expect(day.extraFoods).toHaveLength(1);
    expect(day.extraFoods[0].name).toBe("Börek");
    expect(day.consumed.calories).toBe(300);
    expect(day.comments[0].dietitianName).toBe("Ayşe Yılmaz");
  });

  it("özet gün görünümünden türetilir", () => {
    const day = buildTrackingDay({ date: START, plans: [plan()], ...empty });
    expect(toDaySummary(day)).toMatchObject({ date: "2026-03-01", waterTotalMl: 0, extraFoodCount: 0 });
  });
});
