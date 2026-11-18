import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import type { AuthTokens, Role } from "@fit-sihirbaz/shared";
import type { Env } from "../config/env.validation";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

// jti (RefreshToken.id) ve fam (aile) alanları sunucu tarafı iptal/rotasyon takibi içindir.
// Bu alanlar olmayan eski tokenlar geçersiz sayılır (kullanıcı yeniden giriş yapar).
export interface RefreshTokenPayload {
  sub: string;
  jti?: string;
  fam?: string;
}

export interface IssuedSession {
  tokens: AuthTokens;
  refreshTokenId: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  // Yeni bir refresh token kaydı için gereken her şeyi üretir; kaydı veritabanına
  // yazmak çağıranın (AuthService) işidir.
  issueSession(userId: string, role: Role, familyId: string): IssuedSession {
    const refreshTokenId = randomUUID();
    const refreshToken = this.signRefreshToken(userId, refreshTokenId, familyId);
    const { exp } = jwt.decode(refreshToken) as { exp: number };
    return {
      tokens: { accessToken: this.signAccessToken(userId, role), refreshToken },
      refreshTokenId,
      refreshExpiresAt: new Date(exp * 1000),
    };
  }

  signAccessToken(userId: string, role: Role): string {
    const secret: jwt.Secret = this.config.getOrThrow("JWT_ACCESS_SECRET", { infer: true });
    const options: jwt.SignOptions = {
      expiresIn: this.config.getOrThrow("JWT_ACCESS_EXPIRES_IN", { infer: true }) as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign({ sub: userId, role } satisfies AccessTokenPayload, secret, options);
  }

  signRefreshToken(userId: string, jti: string, familyId: string): string {
    const secret: jwt.Secret = this.config.getOrThrow("JWT_REFRESH_SECRET", { infer: true });
    const options: jwt.SignOptions = {
      expiresIn: this.config.getOrThrow("JWT_REFRESH_EXPIRES_IN", { infer: true }) as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign({ sub: userId, jti, fam: familyId } satisfies RefreshTokenPayload, secret, options);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const secret: jwt.Secret = this.config.getOrThrow("JWT_ACCESS_SECRET", { infer: true });
    return jwt.verify(token, secret) as AccessTokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const secret: jwt.Secret = this.config.getOrThrow("JWT_REFRESH_SECRET", { infer: true });
    return jwt.verify(token, secret) as RefreshTokenPayload;
  }
}
