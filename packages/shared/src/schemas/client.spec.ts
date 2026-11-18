import { LinkToDietitianInputSchema, UpdateClientProfileInputSchema } from "./client";

describe("LinkToDietitianInputSchema", () => {
  it("geçerli e-postayı kabul eder", () => {
    expect(LinkToDietitianInputSchema.safeParse({ clientEmail: "test@example.com" }).success).toBe(true);
  });

  it("geçersiz e-postayı reddeder", () => {
    expect(LinkToDietitianInputSchema.safeParse({ clientEmail: "not-an-email" }).success).toBe(false);
  });
});

describe("UpdateClientProfileInputSchema", () => {
  it("geçerli tarih formatını kabul eder", () => {
    const result = UpdateClientProfileInputSchema.safeParse({ birthDate: "1990-05-20" });
    expect(result.success).toBe(true);
  });

  it("geçersiz tarih formatını reddeder", () => {
    const result = UpdateClientProfileInputSchema.safeParse({ birthDate: "20/05/1990" });
    expect(result.success).toBe(false);
  });

  it("300 cm'den uzun boyu reddeder", () => {
    const result = UpdateClientProfileInputSchema.safeParse({ heightCm: 350 });
    expect(result.success).toBe(false);
  });

  it("boş string enum alanlarını (doldurulmamış select) kabul eder", () => {
    const result = UpdateClientProfileInputSchema.safeParse({
      gender: "",
      goal: "",
      activityLevel: "",
      heightCm: 168,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gender).toBeUndefined();
      expect(result.data.goal).toBeUndefined();
      expect(result.data.activityLevel).toBeUndefined();
    }
  });
});

describe("UpdateClientProfileInputSchema yaşam tarzı alanları", () => {
  it("hobi, spor, alerji listelerini ve diğer alanları kabul eder", () => {
    const result = UpdateClientProfileInputSchema.safeParse({
      occupation: "Öğretmen",
      hobbies: ["Kitap okumak", "Yürüyüş"],
      sports: ["Yüzme"],
      dietaryPreferences: ["Vejetaryen"],
      allergies: ["Fıstık"],
      currentWeightKg: "82.5",
      targetWeightKg: 70,
      city: "İzmir",
      preferredSessionMode: "ONLINE",
      maxBudgetTry: "1500",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentWeightKg).toBe(82.5);
      expect(result.data.maxBudgetTry).toBe(1500);
    }
  });

  it("boş string (doldurulmamış form alanı) opsiyonel alanlarda hata vermez", () => {
    const result = UpdateClientProfileInputSchema.safeParse({
      occupation: "",
      currentWeightKg: "",
      targetWeightKg: "",
      city: "",
      preferredSessionMode: "",
      maxBudgetTry: "",
    });
    expect(result.success).toBe(true);
  });

  it("21 maddelik listeyi ve aşırı uzun maddeyi reddeder", () => {
    expect(UpdateClientProfileInputSchema.safeParse({ hobbies: Array.from({ length: 21 }, (_, i) => `h${i}`) }).success).toBe(false);
    expect(UpdateClientProfileInputSchema.safeParse({ hobbies: ["x".repeat(61)] }).success).toBe(false);
  });

  it("geçersiz görüşme türünü ve negatif kiloyu reddeder", () => {
    expect(UpdateClientProfileInputSchema.safeParse({ preferredSessionMode: "PHONE" }).success).toBe(false);
    expect(UpdateClientProfileInputSchema.safeParse({ currentWeightKg: -5 }).success).toBe(false);
  });
});
