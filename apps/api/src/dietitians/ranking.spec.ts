import {
  normalize,
  qualityScore,
  rankDietitians,
  scoreDietitian,
  WEIGHTS,
  type RankingClient,
  type RankingDietitian,
} from "./ranking";

function client(overrides: Partial<RankingClient> = {}): RankingClient {
  return {
    goal: null,
    city: null,
    preferredSessionMode: null,
    maxBudgetTry: null,
    medicalNotes: null,
    sports: [],
    dietaryPreferences: [],
    allergies: [],
    ...overrides,
  };
}

function dietitian(overrides: Partial<RankingDietitian> = {}): RankingDietitian {
  return {
    id: "d1",
    title: null,
    bio: null,
    specialties: [],
    city: null,
    averageRating: null,
    reviewCount: 0,
    yearsOfExperience: null,
    packages: [{ price: 1000, sessionMode: "BOTH" }],
    ...overrides,
  };
}

describe("normalize", () => {
  it("Türkçe karakterleri ve büyük/küçük harfi eşitler", () => {
    expect(normalize("  Sürdürülebilir  KİLO Yönetimi ")).toBe("surdurulebilir kilo yonetimi");
    expect(normalize("ÇÖLYAK Şeker")).toBe("colyak seker");
  });
});

describe("WEIGHTS", () => {
  it("ağırlıkların toplamı 1'dir", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("qualityScore", () => {
  it("1 yorumlu 5.0, çok yorumlu 4.8'i geçemez", () => {
    expect(qualityScore(5, 1)).toBeLessThan(qualityScore(4.8, 40));
  });

  it("yorumu olmayan diyetisyen nötr/ön kabul puanı alır, 0 almaz", () => {
    expect(qualityScore(null, 0)).toBeCloseTo(0.5, 5);
  });

  it("0-1 aralığında kalır", () => {
    expect(qualityScore(1, 500)).toBe(0);
    expect(qualityScore(5, 500)).toBeLessThanOrEqual(1);
  });
});

describe("scoreDietitian: uzmanlık", () => {
  it("kilo verme hedefi 'Kilo Yönetimi' uzmanını spor uzmanından yukarı koyar", () => {
    const c = client({ goal: "WEIGHT_LOSS" });
    const weight = scoreDietitian(c, dietitian({ id: "a", specialties: ["Kilo Yönetimi"] }));
    const sports = scoreDietitian(c, dietitian({ id: "b", specialties: ["Spor Beslenmesi"] }));
    expect(weight.score).toBeGreaterThan(sports.score);
    expect(weight.reasons.join(" ")).toContain("kilo verme");
  });

  it("tıbbi notlardaki diyabet ifadesi diyabet uzmanını öne çıkarır", () => {
    const c = client({ goal: "MEDICAL", medicalNotes: "Tip 2 diyabet, tansiyon ilacı kullanıyorum" });
    const diabetes = scoreDietitian(c, dietitian({ specialties: ["Diyabet", "Klinik Beslenme"] }));
    const generic = scoreDietitian(c, dietitian({ specialties: ["Spor Beslenmesi"] }));
    expect(diabetes.breakdown.expertise).toBeGreaterThan(generic.breakdown.expertise);
  });

  it("spor yapan danışan için spor beslenmesi uzmanı eşleşir", () => {
    const c = client({ sports: ["Yüzme"] });
    const result = scoreDietitian(c, dietitian({ specialties: ["Sporcu Beslenmesi"] }));
    expect(result.breakdown.expertise).toBe(1);
  });

  it("danışan bilgisi yoksa uzmanlık nötr (0.5) sayılır ve gerekçe üretilmez", () => {
    const result = scoreDietitian(client(), dietitian({ specialties: ["Kilo Yönetimi"] }));
    expect(result.breakdown.expertise).toBe(0.5);
    expect(result.reasons.some((reason) => reason.startsWith("Uzmanlığı"))).toBe(false);
  });

  it("uzmanlık, unvan ve biyografide de aranır (Türkçe karakterden bağımsız)", () => {
    const c = client({ goal: "MUSCLE_GAIN" });
    const result = scoreDietitian(c, dietitian({ bio: "Sporcularla çalışıyorum, performans odaklı." }));
    expect(result.breakdown.expertise).toBe(1);
  });
});

describe("scoreDietitian: konum ve görüşme türü", () => {
  it("yüz yüze isteyen danışan için aynı şehirdeki diyetisyen, farklı şehirdekinden yüksek puan alır", () => {
    const c = client({ preferredSessionMode: "IN_PERSON", city: "İzmir" });
    const same = scoreDietitian(c, dietitian({ city: "izmir" }));
    const other = scoreDietitian(c, dietitian({ city: "Ankara" }));
    expect(same.breakdown.access).toBe(1);
    expect(other.breakdown.access).toBeLessThan(0.2);
  });

  it("sadece online paketi olan diyetisyen yüz yüze isteyene 0 erişim puanı alır", () => {
    const c = client({ preferredSessionMode: "IN_PERSON", city: "İzmir" });
    const result = scoreDietitian(c, dietitian({ city: "İzmir", packages: [{ price: 500, sessionMode: "ONLINE" }] }));
    expect(result.breakdown.access).toBe(0);
  });

  it("online isteyen için şehir önemsizdir", () => {
    const c = client({ preferredSessionMode: "ONLINE", city: "İzmir" });
    const result = scoreDietitian(c, dietitian({ city: "Ankara" }));
    expect(result.breakdown.access).toBe(1);
    expect(result.reasons).toContain("Online görüşme sunuyor");
  });

  it("aktif paketi olmayan diyetisyen düşük erişim puanı alır", () => {
    const result = scoreDietitian(client({ preferredSessionMode: "ONLINE" }), dietitian({ packages: [] }));
    expect(result.breakdown.access).toBeLessThanOrEqual(0.1);
    expect(result.startingPrice).toBeNull();
  });
});

describe("scoreDietitian: bütçe", () => {
  it("bütçe belirtilmemişse nötr (0.5)", () => {
    expect(scoreDietitian(client(), dietitian()).breakdown.budget).toBe(0.5);
  });

  it("en ucuz uygun paket bütçeyi aşmıyorsa tam puan ve gerekçe verir", () => {
    const result = scoreDietitian(
      client({ maxBudgetTry: 1500 }),
      dietitian({ packages: [{ price: 1200, sessionMode: "BOTH" }, { price: 3000, sessionMode: "BOTH" }] }),
    );
    expect(result.breakdown.budget).toBe(1);
    expect(result.reasons.some((reason) => reason.includes("1200"))).toBe(true);
  });

  it("bütçenin %20 üstü kısmi, daha fazlası sıfır puan alır", () => {
    const c = client({ maxBudgetTry: 1000 });
    expect(scoreDietitian(c, dietitian({ packages: [{ price: 1150, sessionMode: "BOTH" }] })).breakdown.budget).toBe(0.4);
    expect(scoreDietitian(c, dietitian({ packages: [{ price: 2000, sessionMode: "BOTH" }] })).breakdown.budget).toBe(0);
  });

  it("danışanın görüşme türüyle uyuşmayan paketlerin fiyatı hesaba katılmaz", () => {
    const c = client({ maxBudgetTry: 1000, preferredSessionMode: "IN_PERSON" });
    const result = scoreDietitian(
      c,
      dietitian({ packages: [{ price: 300, sessionMode: "ONLINE" }, { price: 2500, sessionMode: "IN_PERSON" }] }),
    );
    expect(result.breakdown.budget).toBe(0);
  });
});

describe("rankDietitians", () => {
  it("puana göre azalan sıralar ve 0-100 aralığında puan verir", () => {
    const c = client({ goal: "WEIGHT_LOSS", city: "İzmir", preferredSessionMode: "IN_PERSON", maxBudgetTry: 2000 });
    const ranked = rankDietitians(c, [
      dietitian({ id: "zayif", specialties: ["Spor"], city: "Ankara", packages: [{ price: 5000, sessionMode: "ONLINE" }] }),
      dietitian({
        id: "uygun",
        specialties: ["Kilo Yönetimi"],
        city: "İzmir",
        averageRating: 4.9,
        reviewCount: 25,
        yearsOfExperience: 8,
        packages: [{ price: 1500, sessionMode: "BOTH" }],
      }),
    ]);

    expect(ranked.map((item) => item.dietitianId)).toEqual(["uygun", "zayif"]);
    for (const item of ranked) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("eşit puanda kaliteye, sonra kimliğe göre deterministik sıralar", () => {
    const ranked = rankDietitians(client(), [
      dietitian({ id: "b" }),
      dietitian({ id: "a" }),
      dietitian({ id: "c" }),
    ]);
    expect(ranked.map((item) => item.dietitianId)).toEqual(["a", "b", "c"]);
  });

  it("komisyon oranı veya ödeme alanları girdi olarak kabul edilmez (sıralama yalnızca uygunluk ve kaliteye bağlı)", () => {
    const base = dietitian({ id: "x" });
    const withExtra = { ...base, commissionRate: 0.5, isSponsored: true } as unknown as RankingDietitian;
    expect(scoreDietitian(client(), withExtra).score).toBe(scoreDietitian(client(), base).score);
  });
});
