import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { CONSENT_VERSION } from "@fit-sihirbaz/shared";
import type { AuthResponse, AuthTokens, LoginInput, PublicUser, RegisterInput } from "@fit-sihirbaz/shared";
import type { User } from "@fit-sihirbaz/db";
import { PrismaService } from "../prisma/prisma.service";
import { TokenService } from "./token.service";
import { toPublicUser } from "./auth.mapper";
import { MAIL_PROVIDER, type MailProvider } from "../mail/mail.provider";
import { passwordResetEmail, verificationEmail } from "../mail/mail.templates";
import type { Env } from "../config/env.validation";
import {
  AccountInactiveError,
  EmailAlreadyExistsError,
  EmailAlreadyVerifiedError,
  InvalidCredentialsError,
  InvalidEmailTokenError,
  InvalidRefreshTokenError,
} from "./auth.errors";

const BCRYPT_SALT_ROUNDS = 10;
const REFRESH_REUSE_GRACE_MS = 10 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<Env, true>,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        // Her rıza, onaylanan metin sürümüyle birlikte ayrı satır olarak saklanır (KVKK ispat yükü).
        consents: {
          create: [
            { type: "PRIVACY_NOTICE", version: CONSENT_VERSION },
            { type: "TERMS_OF_SERVICE", version: CONSENT_VERSION },
            ...(input.consents.healthDataExplicit
              ? [{ type: "HEALTH_DATA_EXPLICIT" as const, version: CONSENT_VERSION }]
              : []),
          ],
        },
        ...(input.role === "CLIENT"
          ? { clientProfile: { create: {} } }
          : { dietitianProfile: { create: {} } }),
      },
    });

    this.sendVerificationEmail(user.id).catch((error) =>
      this.logger.error(`Doğrulama e-postası gönderilemedi (userId=${user.id})`, error),
    );

    return await this.buildAuthResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new InvalidCredentialsError();
    }
    if (!user.isActive) {
      throw new AccountInactiveError();
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return await this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: ReturnType<TokenService["verifyRefreshToken"]>;
    try {
      payload = this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new InvalidRefreshTokenError();
    }
    // jti/fam taşımayan (rotasyon öncesi üretilmiş) tokenlar geçersiz sayılır.
    if (!payload.jti || !payload.fam) {
      throw new InvalidRefreshTokenError();
    }

    const record = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!record || record.userId !== payload.sub) {
      throw new InvalidRefreshTokenError();
    }

    if (record.revokedAt) {
      // İptal edilmiş token yeniden geldi: ya çalıntı ya da çakışan iki istek. Kısa bir
      // pencere içindeki tekrar (aynı anda iki sekmenin yenilemesi) oturumu kapatmaz; daha
      // geç gelen tekrar ise tüm aileyi (o girişten türeyen tüm tokenlar) iptal eder.
      if (Date.now() - record.revokedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        await this.revokeFamily(record.familyId);
      }
      throw new InvalidRefreshTokenError();
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new InvalidRefreshTokenError();
    }

    // Eşzamanlı iki isteğin aynı token'ı kullanmasını engelleyen koşullu iptal: sadece biri kazanır.
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      throw new InvalidRefreshTokenError();
    }

    return this.issueSession(user, record.familyId);
  }

  // Refresh token biliniyorsa (web cookie'si) sadece o oturum kapanır; bilinmiyorsa
  // (mobil, token gövdede gelmez) kullanıcının tüm aktif oturumları kapatılır.
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      try {
        const payload = this.tokens.verifyRefreshToken(refreshToken);
        if (payload.sub === userId && payload.fam) {
          await this.revokeFamily(payload.fam);
          return;
        }
      } catch {
        // Geçersiz/süresi dolmuş token: aşağıda kullanıcının tüm oturumları kapatılır.
      }
    }
    await this.revokeAllForUser(userId);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new InvalidCredentialsError();
    }
    return toPublicUser(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Hesap yoksa/pasifse de sessizce başarılı dönülür — hesap varlığı sızdırılmaz.
    if (!user || !user.isActive) {
      return;
    }

    const rawToken = randomBytes(32).toString("base64url");
    await this.prisma.$transaction([
      this.prisma.emailToken.deleteMany({
        where: { userId: user.id, type: "PASSWORD_RESET", usedAt: null },
      }),
      this.prisma.emailToken.create({
        data: {
          userId: user.id,
          type: "PASSWORD_RESET",
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      }),
    ]);

    const webAppUrl = this.config.get("WEB_APP_URL", { infer: true });
    const link = `${webAppUrl}/sifre-sifirla?token=${rawToken}`;
    try {
      await this.mail.send({ to: user.email, ...passwordResetEmail(link) });
    } catch (error) {
      this.logger.error(`Şifre sıfırlama e-postası gönderilemedi (userId=${user.id})`, error);
    }
  }

  async resetPassword(rawToken: string, password: string): Promise<void> {
    const token = await this.consumeEmailToken(rawToken, "PASSWORD_RESET");
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash, isEmailVerified: true },
    });
    // Şifre sıfırlandığında mevcut tüm oturumlar (olası bir ele geçiren dahil) kapatılır.
    await this.revokeAllForUser(token.userId);
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new InvalidCredentialsError();
    }
    if (user.isEmailVerified) {
      throw new EmailAlreadyVerifiedError();
    }

    const rawToken = randomBytes(32).toString("base64url");
    await this.prisma.$transaction([
      this.prisma.emailToken.deleteMany({
        where: { userId: user.id, type: "EMAIL_VERIFICATION", usedAt: null },
      }),
      this.prisma.emailToken.create({
        data: {
          userId: user.id,
          type: "EMAIL_VERIFICATION",
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
        },
      }),
    ]);

    const webAppUrl = this.config.get("WEB_APP_URL", { infer: true });
    const link = `${webAppUrl}/eposta-dogrula?token=${rawToken}`;
    await this.mail.send({ to: user.email, ...verificationEmail(link) });
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const token = await this.consumeEmailToken(rawToken, "EMAIL_VERIFICATION");
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { isEmailVerified: true },
    });
  }

  private async consumeEmailToken(rawToken: string, type: "PASSWORD_RESET" | "EMAIL_VERIFICATION") {
    const token = await this.prisma.emailToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) {
      throw new InvalidEmailTokenError();
    }
    await this.prisma.emailToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    return token;
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    return {
      user: toPublicUser(user),
      tokens: await this.issueSession(user, randomUUID()),
    };
  }

  private async issueSession(user: User, familyId: string): Promise<AuthTokens> {
    const session = this.tokens.issueSession(user.id, user.role, familyId);
    await this.prisma.refreshToken.create({
      data: {
        id: session.refreshTokenId,
        userId: user.id,
        familyId,
        expiresAt: session.refreshExpiresAt,
      },
    });
    return session.tokens;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
