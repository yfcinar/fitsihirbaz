import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import type { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { TokenService } from "../auth/token.service";
import { detectImageMime, isAllowedImageMime } from "./image-signature";
import { ImageContentInterceptor, UploadsAuthGuard } from "./uploads.guards";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const GIF_HEADER = Buffer.from("GIF89a000000", "ascii");
const WEBP_HEADER = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);

describe("detectImageMime", () => {
  it("png, jpeg, gif ve webp imzalarını tanır", () => {
    expect(detectImageMime(PNG_HEADER)).toBe("image/png");
    expect(detectImageMime(JPEG_HEADER)).toBe("image/jpeg");
    expect(detectImageMime(GIF_HEADER)).toBe("image/gif");
    expect(detectImageMime(WEBP_HEADER)).toBe("image/webp");
  });

  it("HTML/SVG/boş içerik için null döner", () => {
    expect(detectImageMime(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectImageMime(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImageMime(Buffer.alloc(0))).toBeNull();
  });

  it("izin verilen mime listesi dışındakileri reddeder", () => {
    expect(isAllowedImageMime("image/svg+xml")).toBe(false);
    expect(isAllowedImageMime("text/html")).toBe(false);
    expect(isAllowedImageMime("image/png")).toBe(true);
  });
});

describe("ImageContentInterceptor", () => {
  let dir: string;
  const interceptor = new ImageContentInterceptor();
  const next: CallHandler = { handle: () => of("ok") };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "upload-test-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function contextFor(file: Partial<Express.Multer.File> | undefined): ExecutionContext {
    return { switchToHttp: () => ({ getRequest: () => ({ file }) }) } as unknown as ExecutionContext;
  }

  it("baytlar bildirilen türle uyuşuyorsa isteği geçirir ve dosyayı korur", () => {
    const path = join(dir, "a.png");
    writeFileSync(path, PNG_HEADER);

    interceptor.intercept(contextFor({ path, mimetype: "image/png" }), next);

    expect(existsSync(path)).toBe(true);
  });

  it("image/png diye gönderilmiş HTML dosyasını siler ve BadRequestException fırlatır", () => {
    const path = join(dir, "evil.png");
    writeFileSync(path, "<html><script>alert(1)</script></html>");

    expect(() => interceptor.intercept(contextFor({ path, mimetype: "image/png" }), next)).toThrow(
      BadRequestException,
    );
    expect(existsSync(path)).toBe(false);
  });

  it("gerçek bir jpeg'i png diye gönderen dosyayı da reddeder (tür uyuşmazlığı)", () => {
    const path = join(dir, "mismatch.png");
    writeFileSync(path, JPEG_HEADER);

    expect(() => interceptor.intercept(contextFor({ path, mimetype: "image/png" }), next)).toThrow(
      BadRequestException,
    );
    expect(existsSync(path)).toBe(false);
  });

  it("dosya yoksa (fileFilter reddetmişse) isteği olduğu gibi geçirir", () => {
    expect(() => interceptor.intercept(contextFor(undefined), next)).not.toThrow();
  });
});

describe("UploadsAuthGuard", () => {
  const config = {
    getOrThrow: (key: string) => {
      if (key === "JWT_ACCESS_SECRET") return "test-access-secret";
      if (key === "JWT_ACCESS_EXPIRES_IN") return "15m";
      throw new Error(`unexpected config key: ${key}`);
    },
  };
  const tokenService = new TokenService(config as unknown as ConfigService<Env, true>);
  const guard = new UploadsAuthGuard(tokenService);

  function contextFor(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ headers, cookies: {} }) }),
    } as unknown as ExecutionContext;
  }

  it("token yoksa UnauthorizedException fırlatır", () => {
    expect(() => guard.canActivate(contextFor({}))).toThrow(UnauthorizedException);
  });

  it("geçerli access token ile izin verir", () => {
    const token = tokenService.signAccessToken("user-1", "CLIENT");
    expect(guard.canActivate(contextFor({ authorization: `Bearer ${token}` }))).toBe(true);
  });
});
