import { CONSENT_VERSION } from "@fit-sihirbaz/shared";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  ShowcaseAlreadyActiveError,
  ShowcaseNotEligibleError,
  ShowcaseNotLinkedError,
} from "./showcase.errors";
import { ShowcaseService } from "./showcase.service";

const CLIENT = { id: "client-1", userId: "client-user", goal: "WEIGHT_LOSS" };
const DIETITIAN = { id: "dietitian-1", userId: "dyt-user", user: { firstName: "Ayşe", lastName: "Yılmaz" } };

function weightLog(date: string, weight: number, photoUrls: string[] = []) {
  return { logDate: new Date(`${date}T00:00:00Z`), weightKg: weight, photoUrls };
}

describe("ShowcaseService", () => {
  let prisma: {
    clientProfile: { findUnique: jest.Mock };
    dietitianProfile: { findUnique: jest.Mock };
    clientDietitianLink: { findFirst: jest.Mock; findMany: jest.Mock };
    showcaseConsent: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock; update: jest.Mock };
    progressLog: { findMany: jest.Mock };
    consentRecord: { create: jest.Mock; updateMany: jest.Mock };
  };
  let notifications: { create: jest.Mock };
  let service: ShowcaseService;

  beforeEach(() => {
    prisma = {
      clientProfile: { findUnique: jest.fn().mockResolvedValue(CLIENT) },
      dietitianProfile: { findUnique: jest.fn().mockResolvedValue(DIETITIAN) },
      clientDietitianLink: { findFirst: jest.fn().mockResolvedValue({ id: "link-1" }), findMany: jest.fn().mockResolvedValue([]) },
      showcaseConsent: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      progressLog: { findMany: jest.fn().mockResolvedValue([weightLog("2026-01-01", 90), weightLog("2026-03-01", 82)]) },
      consentRecord: { create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ShowcaseService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  });

  describe("setConsent", () => {
    const GRANT = { dietitianId: "dietitian-1", active: true, anonymous: true, includePhotos: false };

    it("diyetisyenle hiç bağı olmayan danışan izin veremez", async () => {
      prisma.clientDietitianLink.findFirst.mockResolvedValue(null);
      await expect(service.setConsent("client-user", GRANT)).rejects.toBeInstanceOf(ShowcaseNotLinkedError);
      expect(prisma.showcaseConsent.upsert).not.toHaveBeenCalled();
    });

    it("iki kilo ölçümü yoksa izin verilemez", async () => {
      prisma.progressLog.findMany.mockResolvedValue([weightLog("2026-01-01", 90)]);
      await expect(service.setConsent("client-user", GRANT)).rejects.toBeInstanceOf(ShowcaseNotEligibleError);
      expect(prisma.showcaseConsent.upsert).not.toHaveBeenCalled();
    });

    it("izin verildiğinde varsayılan olarak anonim/fotoğrafsız kaydeder ve denetim izi yazar", async () => {
      await service.setConsent("client-user", GRANT);

      expect(prisma.showcaseConsent.upsert.mock.calls[0][0].create).toMatchObject({
        clientId: "client-1",
        dietitianId: "dietitian-1",
        anonymous: true,
        includePhotos: false,
      });
      expect(prisma.consentRecord.create).toHaveBeenCalledWith({
        data: { userId: "client-user", type: "SHOWCASE_PROGRESS", version: `${CONSENT_VERSION}|dietitian:dietitian-1` },
      });
    });

    it("zaten aktif izni güncellemek yeni bir rıza kaydı oluşturmaz", async () => {
      prisma.showcaseConsent.findUnique.mockResolvedValue({ id: "c1", revokedAt: null });
      await service.setConsent("client-user", { ...GRANT, includePhotos: true });
      expect(prisma.consentRecord.create).not.toHaveBeenCalled();
    });

    it("daha önce geri çekilmiş izni yeniden verince yeni rıza kaydı oluşur", async () => {
      prisma.showcaseConsent.findUnique.mockResolvedValue({ id: "c1", revokedAt: new Date() });
      await service.setConsent("client-user", GRANT);
      expect(prisma.consentRecord.create).toHaveBeenCalledTimes(1);
    });

    it("izni geri çekince satır silinmez, revokedAt dolar ve denetim izi kapanır", async () => {
      prisma.showcaseConsent.findUnique.mockResolvedValue({ id: "c1", revokedAt: null });

      await service.setConsent("client-user", { ...GRANT, active: false });

      expect(prisma.showcaseConsent.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.consentRecord.updateMany.mock.calls[0][0].where).toMatchObject({
        userId: "client-user",
        type: "SHOWCASE_PROGRESS",
        revokedAt: null,
      });
    });

    it("geri çekme, yeterli kilo ölçümü olmasa bile her zaman mümkündür", async () => {
      prisma.progressLog.findMany.mockResolvedValue([]);
      prisma.showcaseConsent.findUnique.mockResolvedValue({ id: "c1", revokedAt: null });
      await expect(service.setConsent("client-user", { ...GRANT, active: false })).resolves.toBeDefined();
    });
  });

  describe("listForDietitian (herkese açık)", () => {
    function consentRow(overrides: Record<string, unknown> = {}) {
      return {
        anonymous: true,
        includePhotos: false,
        client: {
          goal: "WEIGHT_LOSS",
          user: { firstName: "Ayşe", lastName: "Kaya" },
          progressLogs: [weightLog("2026-01-01", 90), weightLog("2026-03-01", 82)],
        },
        ...overrides,
      };
    }

    it("yalnızca aktif (geri çekilmemiş) izinleri ve onaylı diyetisyeni sorgular", async () => {
      await service.listForDietitian("dietitian-1");
      expect(prisma.showcaseConsent.findMany.mock.calls[0][0].where).toEqual({
        dietitianId: "dietitian-1",
        revokedAt: null,
        dietitian: { verificationStatus: "VERIFIED" },
      });
    });

    it("anonim izinde isim sızdırmaz", async () => {
      prisma.showcaseConsent.findMany.mockResolvedValue([consentRow()]);
      const result = await service.listForDietitian("dietitian-1");
      expect(result[0].displayName).toBe("Anonim danışan");
      expect(JSON.stringify(result)).not.toContain("Ayşe");
      expect(JSON.stringify(result)).not.toContain("Kaya");
    });

    it("izin sonrası ölçüm sayısı ikinin altına düşerse kayıt gösterilmez", async () => {
      prisma.showcaseConsent.findMany.mockResolvedValue([
        consentRow({ client: { goal: null, user: { firstName: "A", lastName: "B" }, progressLogs: [weightLog("2026-01-01", 90)] } }),
      ]);
      expect(await service.listForDietitian("dietitian-1")).toEqual([]);
    });
  });

  describe("requestConsent", () => {
    it("bağlı olmayan danışandan izin istenemez", async () => {
      prisma.clientDietitianLink.findFirst.mockResolvedValue(null);
      await expect(service.requestConsent("dyt-user", "client-1")).rejects.toBeInstanceOf(ShowcaseNotLinkedError);
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it("zaten izin vermiş danışandan tekrar istenmez", async () => {
      prisma.clientDietitianLink.findFirst.mockResolvedValue({ id: "l", client: CLIENT });
      prisma.showcaseConsent.findUnique.mockResolvedValue({ revokedAt: null });
      await expect(service.requestConsent("dyt-user", "client-1")).rejects.toBeInstanceOf(ShowcaseAlreadyActiveError);
    });

    it("danışana bildirim gönderir; izni kendisi vermez", async () => {
      prisma.clientDietitianLink.findFirst.mockResolvedValue({ id: "l", client: CLIENT });

      await service.requestConsent("dyt-user", "client-1");

      expect(notifications.create).toHaveBeenCalledWith("client-user", "SHOWCASE_REQUEST", { dietitianName: "Ayşe Yılmaz" });
      expect(prisma.showcaseConsent.upsert).not.toHaveBeenCalled();
    });
  });

  describe("myConsents", () => {
    it("diyetisyen başına tek satır döner ve uygunluğu (≥2 kilo ölçümü) hesaplar", async () => {
      prisma.clientDietitianLink.findMany.mockResolvedValue([
        { dietitianId: "dietitian-1", status: "ENDED", dietitian: DIETITIAN },
        { dietitianId: "dietitian-1", status: "ACTIVE", dietitian: DIETITIAN },
      ]);
      prisma.showcaseConsent.findMany.mockResolvedValue([
        { dietitianId: "dietitian-1", revokedAt: null, anonymous: false, includePhotos: true },
      ]);

      const result = await service.myConsents("client-user");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ linkActive: true, active: true, anonymous: false, includePhotos: true, eligible: true });
    });
  });
});
