import { Injectable, Logger } from "@nestjs/common";
import { CONSENT_VERSION } from "@fit-sihirbaz/shared";
import type {
  MyShowcaseConsent,
  SetShowcaseConsentInput,
  ShowcaseTransformation,
} from "@fit-sihirbaz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  ClientProfileNotFoundError,
  DietitianProfileNotFoundError,
  ShowcaseAlreadyActiveError,
  ShowcaseNotEligibleError,
  ShowcaseNotLinkedError,
} from "./showcase.errors";
import { buildTransformation, MIN_WEIGHT_LOGS, weightLogs, type ShowcaseLog } from "./showcase.mapper";

function toLogs(rows: Array<{ logDate: Date; weightKg: unknown; photoUrls: string[] }>): ShowcaseLog[] {
  return rows.map((row) => ({
    logDate: row.logDate,
    weightKg: row.weightKg === null || row.weightKg === undefined ? null : Number(row.weightKg),
    photoUrls: row.photoUrls,
  }));
}

// ConsentRecord'a (denetim izi) hangi diyetisyen için verildiğini yazmak için sürüm alanına eklenir.
function consentVersionFor(dietitianId: string): string {
  return `${CONSENT_VERSION}|dietitian:${dietitianId}`;
}

@Injectable()
export class ShowcaseService {
  private readonly logger = new Logger(ShowcaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---- Danışan: kendi izinlerini görür ve yönetir ----

  async myConsents(clientUserId: string): Promise<MyShowcaseConsent[]> {
    const client = await this.getClient(clientUserId);
    const [links, consents, logs] = await Promise.all([
      this.prisma.clientDietitianLink.findMany({
        where: { clientId: client.id },
        include: { dietitian: { include: { user: true } } },
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.showcaseConsent.findMany({ where: { clientId: client.id } }),
      this.prisma.progressLog.findMany({ where: { clientId: client.id }, select: { logDate: true, weightKg: true, photoUrls: true } }),
    ]);
    const weightLogCount = weightLogs(toLogs(logs)).length;

    // Aynı diyetisyenle birden fazla bağ olabilir; diyetisyen başına tek satır, aktif bağ öncelikli.
    const byDietitian = new Map<string, (typeof links)[number]>();
    for (const link of links) {
      const existing = byDietitian.get(link.dietitianId);
      if (!existing || (existing.status !== "ACTIVE" && link.status === "ACTIVE")) {
        byDietitian.set(link.dietitianId, link);
      }
    }

    return [...byDietitian.values()].map((link) => {
      const consent = consents.find((entry) => entry.dietitianId === link.dietitianId);
      return {
        dietitianId: link.dietitianId,
        dietitianName: `${link.dietitian.user.firstName} ${link.dietitian.user.lastName}`.trim(),
        linkActive: link.status === "ACTIVE",
        active: !!consent && consent.revokedAt === null,
        anonymous: consent?.anonymous ?? true,
        includePhotos: consent?.includePhotos ?? false,
        eligible: weightLogCount >= MIN_WEIGHT_LOGS,
        weightLogCount,
      };
    });
  }

  async setConsent(clientUserId: string, input: SetShowcaseConsentInput): Promise<MyShowcaseConsent[]> {
    const client = await this.getClient(clientUserId);
    // Daha önce bu diyetisyenle çalışmış (bağı bitmiş olsa da) danışan izin verebilir.
    const link = await this.prisma.clientDietitianLink.findFirst({
      where: { clientId: client.id, dietitianId: input.dietitianId },
    });
    if (!link) {
      throw new ShowcaseNotLinkedError();
    }

    const existing = await this.prisma.showcaseConsent.findUnique({
      where: { clientId_dietitianId: { clientId: client.id, dietitianId: input.dietitianId } },
    });

    if (input.active) {
      const logs = await this.prisma.progressLog.findMany({
        where: { clientId: client.id },
        select: { logDate: true, weightKg: true, photoUrls: true },
      });
      if (weightLogs(toLogs(logs)).length < MIN_WEIGHT_LOGS) {
        throw new ShowcaseNotEligibleError();
      }
      const newlyGranted = !existing || existing.revokedAt !== null;
      await this.prisma.showcaseConsent.upsert({
        where: { clientId_dietitianId: { clientId: client.id, dietitianId: input.dietitianId } },
        create: {
          clientId: client.id,
          dietitianId: input.dietitianId,
          anonymous: input.anonymous,
          includePhotos: input.includePhotos,
        },
        update: {
          anonymous: input.anonymous,
          includePhotos: input.includePhotos,
          revokedAt: null,
          ...(newlyGranted ? { grantedAt: new Date() } : {}),
        },
      });
      if (newlyGranted) {
        await this.prisma.consentRecord.create({
          data: { userId: clientUserId, type: "SHOWCASE_PROGRESS", version: consentVersionFor(input.dietitianId) },
        });
      }
    } else if (existing && existing.revokedAt === null) {
      // Geri çekme: izin satırı silinmez, revokedAt dolar; vitrin anında kapanır.
      const now = new Date();
      await this.prisma.showcaseConsent.update({ where: { id: existing.id }, data: { revokedAt: now } });
      await this.prisma.consentRecord.updateMany({
        where: { userId: clientUserId, type: "SHOWCASE_PROGRESS", version: consentVersionFor(input.dietitianId), revokedAt: null },
        data: { revokedAt: now },
      });
    }

    return this.myConsents(clientUserId);
  }

  // ---- Herkese açık vitrin ----

  async listForDietitian(dietitianId: string): Promise<ShowcaseTransformation[]> {
    const consents = await this.prisma.showcaseConsent.findMany({
      where: { dietitianId, revokedAt: null, dietitian: { verificationStatus: "VERIFIED" } },
      include: {
        client: {
          include: {
            user: true,
            progressLogs: { select: { logDate: true, weightKg: true, photoUrls: true } },
          },
        },
      },
      orderBy: { grantedAt: "desc" },
    });

    const items: ShowcaseTransformation[] = [];
    for (const consent of consents) {
      const transformation = buildTransformation(
        { firstName: consent.client.user.firstName, lastName: consent.client.user.lastName, goal: consent.client.goal },
        toLogs(consent.client.progressLogs),
        { anonymous: consent.anonymous, includePhotos: consent.includePhotos },
      );
      if (transformation) items.push(transformation);
    }
    return items;
  }

  // ---- Diyetisyen: izin isteyebilir, zorlayamaz ----

  async requestConsent(dietitianUserId: string, clientId: string): Promise<{ success: true }> {
    const dietitian = await this.prisma.dietitianProfile.findUnique({
      where: { userId: dietitianUserId },
      include: { user: true },
    });
    if (!dietitian) {
      throw new DietitianProfileNotFoundError();
    }
    const link = await this.prisma.clientDietitianLink.findFirst({
      where: { clientId, dietitianId: dietitian.id, status: "ACTIVE" },
      include: { client: true },
    });
    if (!link) {
      throw new ShowcaseNotLinkedError();
    }
    const consent = await this.prisma.showcaseConsent.findUnique({
      where: { clientId_dietitianId: { clientId, dietitianId: dietitian.id } },
    });
    if (consent && consent.revokedAt === null) {
      throw new ShowcaseAlreadyActiveError();
    }

    try {
      await this.notifications.create(link.client.userId, "SHOWCASE_REQUEST", {
        dietitianName: `${dietitian.user.firstName} ${dietitian.user.lastName}`.trim(),
      });
    } catch (error) {
      this.logger.warn(`Vitrin izni bildirimi gönderilemedi: ${(error as Error).message}`);
    }
    return { success: true };
  }

  private async getClient(userId: string) {
    const client = await this.prisma.clientProfile.findUnique({ where: { userId } });
    if (!client) {
      throw new ClientProfileNotFoundError();
    }
    return client;
  }
}
