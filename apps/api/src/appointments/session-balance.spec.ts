import { computeBalance, modeAllows, pickOrderForBooking, type BalanceOrder } from "./session-balance";

const NOW = new Date("2026-07-10T00:00:00Z");

function order(overrides: Partial<BalanceOrder> & { pkg?: Partial<BalanceOrder["package"]> } = {}): BalanceOrder {
  const { pkg, ...rest } = overrides;
  return {
    id: "o1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    package: { title: "Paket", durationDays: 30, sessionCount: 4, sessionMode: "BOTH", ...pkg },
    appointments: [],
    ...rest,
  };
}

describe("modeAllows", () => {
  it("BOTH her türü, diğerleri sadece kendi türünü kapsar", () => {
    expect(modeAllows("BOTH", "ONLINE")).toBe(true);
    expect(modeAllows("BOTH", "IN_PERSON")).toBe(true);
    expect(modeAllows("ONLINE", "ONLINE")).toBe(true);
    expect(modeAllows("ONLINE", "IN_PERSON")).toBe(false);
    expect(modeAllows("IN_PERSON", "ONLINE")).toBe(false);
  });
});

describe("computeBalance", () => {
  it("paket yoksa hasPackages false ve toplam 0 döner", () => {
    expect(computeBalance([], NOW)).toEqual({ hasPackages: false, packages: [], totalRemaining: 0 });
  });

  it("kullanılan seansı düşer, süresi dolan paketi toplama katmaz", () => {
    const result = computeBalance(
      [
        order({ id: "aktif", appointments: [{}, {}] }),
        order({ id: "dolmus", pkg: { durationDays: 5, sessionCount: 10 } }),
      ],
      NOW,
    );

    expect(result.packages.find((pkg) => pkg.orderId === "aktif")).toMatchObject({ used: 2, remaining: 2, expired: false });
    expect(result.packages.find((pkg) => pkg.orderId === "dolmus")?.expired).toBe(true);
    expect(result.totalRemaining).toBe(2);
  });

  it("sınırsız (sayısı belirtilmemiş) bir aktif paket varsa toplam null olur", () => {
    const result = computeBalance([order({ pkg: { sessionCount: null } })], NOW);
    expect(result.totalRemaining).toBeNull();
  });

  it("kullanım sayıyı aşsa bile remaining negatif olmaz", () => {
    const result = computeBalance([order({ pkg: { sessionCount: 1 }, appointments: [{}, {}] })], NOW);
    expect(result.packages[0].remaining).toBe(0);
  });
});

describe("pickOrderForBooking", () => {
  const SCHEDULED = new Date("2026-07-15T10:00:00Z");

  it("hiç sipariş yoksa kısıtsız (no-packages) döner", () => {
    expect(pickOrderForBooking([], "ONLINE", SCHEDULED)).toEqual({ kind: "no-packages" });
  });

  it("uygun en eski siparişi seçer", () => {
    const result = pickOrderForBooking(
      [
        order({ id: "yeni", createdAt: new Date("2026-07-05T00:00:00Z") }),
        order({ id: "eski", createdAt: new Date("2026-07-01T00:00:00Z") }),
      ],
      "ONLINE",
      SCHEDULED,
    );
    expect(result.kind === "ok" && result.order.id).toBe("eski");
  });

  it("tür uyumsuzluğunu süre ve hak kontrolünden önce bildirir", () => {
    const result = pickOrderForBooking([order({ pkg: { sessionMode: "IN_PERSON" } })], "ONLINE", SCHEDULED);
    expect(result.kind).toBe("mode-not-allowed");
  });

  it("randevu tarihinde süresi dolmuş paketi expired olarak bildirir", () => {
    const result = pickOrderForBooking([order({ pkg: { durationDays: 10 } })], "ONLINE", SCHEDULED);
    expect(result.kind).toBe("expired");
  });

  it("randevu tarihi paketin son gününe denk gelirse hâlâ geçerlidir", () => {
    const result = pickOrderForBooking(
      [order({ createdAt: new Date("2026-07-01T00:00:00Z"), pkg: { durationDays: 14 } })],
      "ONLINE",
      new Date("2026-07-15T00:00:00Z"),
    );
    expect(result.kind).toBe("ok");
  });

  it("hakkı biten paket için no-sessions döner", () => {
    const result = pickOrderForBooking([order({ pkg: { sessionCount: 1 }, appointments: [{}] })], "ONLINE", SCHEDULED);
    expect(result.kind).toBe("no-sessions");
  });
});
