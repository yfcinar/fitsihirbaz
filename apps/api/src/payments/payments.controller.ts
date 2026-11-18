import { createHmac, timingSafeEqual } from "node:crypto";
import {
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { z } from "zod";
import type { Env } from "../config/env.validation";
import { PaymentsService } from "./payments.service";

const WebhookPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(["SUCCESS", "FAILED"]),
});

function verifySignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

// Gerçek bir ödeme sağlayıcısının (iyzico/PayTR) sunucudan sunucuya çağıracağı
// production-şekilli endpoint. Mock akışında bu endpoint şu an kullanılmıyor
// (payments.simulateOutcome tRPC mutation'ı applyProviderResult'ı doğrudan çağırıyor);
// gerçek sağlayıcı entegre edildiğinde imza doğrulama o sağlayıcının şemasına göre
// güncellenmeli.
@Controller("webhooks/payments")
export class PaymentsWebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-webhook-signature") signature?: string,
  ): Promise<{ received: true }> {
    const secret = this.config.get("PAYMENT_WEBHOOK_SECRET", { infer: true });
    // İmza, sağlayıcının gönderdiği ham gövde üzerinden doğrulanır; JSON.parse + stringify
    // boşluk/anahtar sırasını değiştirebileceği için yeniden üretilmiş metne güvenilmez.
    if (!req.rawBody || !verifySignature(req.rawBody.toString("utf8"), signature, secret)) {
      throw new UnauthorizedException("Geçersiz webhook imzası");
    }

    const payload = WebhookPayloadSchema.parse(req.body);
    await this.paymentsService.applyProviderResult(payload.paymentId, payload.status);
    return { received: true };
  }
}
