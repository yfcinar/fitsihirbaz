import { closeSync, openSync, readSync, unlinkSync } from "node:fs";
import {
  BadRequestException,
  CallHandler,
  CanActivate,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { resolveAuthedUser } from "../auth/resolve-authed-user";
import { TokenService } from "../auth/token.service";
import { detectImageMime, IMAGE_HEADER_BYTES } from "./image-signature";

// Guard'lar interceptor'lardan (multer'ın diske yazdığı yer) önce çalışır; böylece giriş
// yapmamış bir istek hiçbir dosyayı diske yazdıramaz.
@Injectable()
export class UploadsAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!resolveAuthedUser(req, this.tokenService)) {
      throw new UnauthorizedException("Giriş yapmanız gerekiyor");
    }
    return true;
  }
}

function readHeader(path: string): Buffer {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(IMAGE_HEADER_BYTES);
    const bytesRead = readSync(fd, buffer, 0, IMAGE_HEADER_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

// multer dosyayı yazdıktan sonra çalışır: baytlar bildirilen türle uyuşmuyorsa dosya silinir
// ve istek reddedilir (ör. "image/png" diye gönderilmiş bir HTML/SVG/çalıştırılabilir dosya).
@Injectable()
export class ImageContentInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { file?: Express.Multer.File }>();
    const file = req.file;
    if (file?.path) {
      let detected: string | null = null;
      try {
        detected = detectImageMime(readHeader(file.path));
      } catch {
        detected = null;
      }
      if (detected !== file.mimetype) {
        try {
          unlinkSync(file.path);
        } catch {
          // Dosya zaten yoksa yapılacak bir şey kalmadı.
        }
        throw new BadRequestException("Dosya içeriği geçerli bir resim değil");
      }
    }
    return next.handle();
  }
}
