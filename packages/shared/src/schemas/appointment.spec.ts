import { CreateAppointmentInputSchema } from "./appointment";

describe("CreateAppointmentInputSchema", () => {
  const validInput = {
    dietitianId: "123e4567-e89b-12d3-a456-426614174000",
    scheduledAt: "2026-07-15T14:30",
  };

  it("geçerli tarih/saat girdisini kabul eder", () => {
    expect(CreateAppointmentInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("geçersiz tarih formatını reddeder", () => {
    expect(CreateAppointmentInputSchema.safeParse({ ...validInput, scheduledAt: "15/07/2026" }).success).toBe(
      false,
    );
  });

  it("boş string durationMinutes değerini (doldurulmamış form alanı) kabul eder", () => {
    const result = CreateAppointmentInputSchema.safeParse({ ...validInput, durationMinutes: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationMinutes).toBeUndefined();
    }
  });

  it("480 dakikadan uzun süreyi reddeder", () => {
    expect(CreateAppointmentInputSchema.safeParse({ ...validInput, durationMinutes: 600 }).success).toBe(false);
  });
});

describe("CreateAppointmentInputSchema type", () => {
  const base = { dietitianId: "11111111-1111-1111-1111-111111111111", scheduledAt: "2026-07-15T14:30" };

  it("type verilmezse ONLINE varsayar", () => {
    const result = CreateAppointmentInputSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("ONLINE");
    }
  });

  it("IN_PERSON kabul eder, bilinmeyen türü reddeder", () => {
    expect(CreateAppointmentInputSchema.safeParse({ ...base, type: "IN_PERSON" }).success).toBe(true);
    expect(CreateAppointmentInputSchema.safeParse({ ...base, type: "PHONE" }).success).toBe(false);
  });
});
