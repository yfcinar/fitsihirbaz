import { buildTransformation, displayName, type ShowcaseLog } from "./showcase.mapper";

const SUBJECT = { firstName: "Ayşe", lastName: "kaya", goal: "WEIGHT_LOSS" as const };

function log(date: string, weightKg: number | null, photoUrls: string[] = []): ShowcaseLog {
  return { logDate: new Date(`${date}T00:00:00Z`), weightKg, photoUrls };
}

describe("displayName", () => {
  it("anonim izinde isim hiç gösterilmez", () => {
    expect(displayName(SUBJECT, true)).toBe("Anonim danışan");
    expect(displayName(SUBJECT, true)).not.toContain("Ayşe");
  });

  it("anonim değilse ad ve soyadın baş harfi gösterilir (soyad tam yazılmaz)", () => {
    expect(displayName(SUBJECT, false)).toBe("Ayşe K.");
    expect(displayName({ ...SUBJECT, lastName: "ışık" }, false)).toBe("Ayşe I.");
  });
});

describe("buildTransformation", () => {
  const LOGS = [log("2026-01-01", 90), log("2026-02-01", 86.2), log("2026-04-01", 80.4)];

  it("ilk ve son ölçüme göre değişimi, süreyi ve yüzdeyi hesaplar", () => {
    const result = buildTransformation(SUBJECT, LOGS, { anonymous: true, includePhotos: false });
    expect(result).toMatchObject({
      startWeightKg: 90,
      currentWeightKg: 80.4,
      changeKg: -9.6,
      changePercent: -10.7,
      durationDays: 90,
      goal: "WEIGHT_LOSS",
    });
  });

  it("sıradan bağımsız olarak tarihe göre ilk/son ölçümü seçer", () => {
    const shuffled = [LOGS[2], LOGS[0], LOGS[1]];
    const result = buildTransformation(SUBJECT, shuffled, { anonymous: true, includePhotos: false });
    expect(result?.startWeightKg).toBe(90);
    expect(result?.currentWeightKg).toBe(80.4);
  });

  it("en az iki kilo ölçümü yoksa null döner", () => {
    expect(buildTransformation(SUBJECT, [log("2026-01-01", 90)], { anonymous: true, includePhotos: false })).toBeNull();
    expect(
      buildTransformation(SUBJECT, [log("2026-01-01", 90), log("2026-02-01", null)], { anonymous: true, includePhotos: false }),
    ).toBeNull();
  });

  it("fotoğraf izni yoksa fotoğraf URL'leri asla dönmez", () => {
    const withPhotos = [log("2026-01-01", 90, ["/uploads/progress/a.jpg"]), log("2026-04-01", 80, ["/uploads/progress/b.jpg"])];
    const result = buildTransformation(SUBJECT, withPhotos, { anonymous: true, includePhotos: false });
    expect(result?.beforePhotoUrl).toBeNull();
    expect(result?.afterPhotoUrl).toBeNull();
  });

  it("fotoğraf izni varsa en eski ve en yeni fotoğrafı (önce/sonra) döner", () => {
    const withPhotos = [
      log("2026-01-01", 90, ["/uploads/progress/a.jpg"]),
      log("2026-02-01", 86, ["/uploads/progress/orta.jpg"]),
      log("2026-04-01", 80, ["/uploads/progress/b.jpg"]),
    ];
    const result = buildTransformation(SUBJECT, withPhotos, { anonymous: true, includePhotos: true });
    expect(result?.beforePhotoUrl).toBe("/uploads/progress/a.jpg");
    expect(result?.afterPhotoUrl).toBe("/uploads/progress/b.jpg");
  });

  it("tek fotoğraf varsa önce/sonra karşılaştırması oluşmaz", () => {
    const result = buildTransformation(
      SUBJECT,
      [log("2026-01-01", 90, ["/uploads/progress/a.jpg"]), log("2026-04-01", 80)],
      { anonymous: true, includePhotos: true },
    );
    expect(result?.beforePhotoUrl).toBeNull();
  });

  it("çıktı yalnızca toplulaştırılmış alanları içerir (not, ölçü veya kimlik yok)", () => {
    const result = buildTransformation(SUBJECT, LOGS, { anonymous: true, includePhotos: false });
    expect(Object.keys(result ?? {}).sort()).toEqual(
      [
        "afterPhotoUrl",
        "beforePhotoUrl",
        "changeKg",
        "changePercent",
        "currentWeightKg",
        "displayName",
        "durationDays",
        "goal",
        "startWeightKg",
      ].sort(),
    );
  });
});
