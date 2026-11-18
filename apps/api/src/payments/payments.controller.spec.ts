import { createHmac } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { ZodError } from "zod";
import { PaymentsWebhookController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import type { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";

const WEBHOOK_SECRET = "test-webhook-secret";

function signRaw(raw: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
}

// Gerçek istekte Nest ham gövdeyi (rawBody) ve parse edilmiş gövdeyi (body) ayrı tutar.
function makeRequest(raw: string | undefined): RawBodyRequest<Request> {
  return {
    rawBody: raw === undefined ? undefined : Buffer.from(raw),
    body: raw === undefined ? undefined : JSON.parse(raw),
  } as unknown as RawBodyRequest<Request>;
}

describe("PaymentsWebhookController", () => {
  let paymentsService: { applyProviderResult: jest.Mock };
  let controller: PaymentsWebhookController;

  beforeEach(() => {
    paymentsService = { applyProviderResult: jest.fn() };
    const config = { get: (key: string) => (key === "PAYMENT_WEBHOOK_SECRET" ? WEBHOOK_SECRET : undefined) };
    controller = new PaymentsWebhookController(
      paymentsService as unknown as PaymentsService,
      config as unknown as ConfigService<Env, true>,
    );
  });

  it("imza eksikse UnauthorizedException fırlatır ve servisi çağırmaz", async () => {
    const raw = JSON.stringify({ paymentId: "11111111-1111-1111-1111-111111111111", status: "SUCCESS" });
    await expect(controller.handleWebhook(makeRequest(raw), undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(paymentsService.applyProviderResult).not.toHaveBeenCalled();
  });

  it("imza yanlışsa UnauthorizedException fırlatır", async () => {
    const raw = JSON.stringify({ paymentId: "11111111-1111-1111-1111-111111111111", status: "SUCCESS" });
    await expect(controller.handleWebhook(makeRequest(raw), "yanlis-imza")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(paymentsService.applyProviderResult).not.toHaveBeenCalled();
  });

  it("ham gövde yoksa UnauthorizedException fırlatır", async () => {
    await expect(controller.handleWebhook(makeRequest(undefined), "herhangi")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(paymentsService.applyProviderResult).not.toHaveBeenCalled();
  });

  it("geçerli imza + geçersiz payload şemasında ZodError fırlatır", async () => {
    const raw = JSON.stringify({ paymentId: "not-a-uuid", status: "SUCCESS" });
    await expect(controller.handleWebhook(makeRequest(raw), signRaw(raw))).rejects.toBeInstanceOf(ZodError);
    expect(paymentsService.applyProviderResult).not.toHaveBeenCalled();
  });

  it("geçerli imza + geçerli payload ile applyProviderResult'ı çağırır ve received döner", async () => {
    const raw = JSON.stringify({ paymentId: "11111111-1111-1111-1111-111111111111", status: "SUCCESS" });

    const result = await controller.handleWebhook(makeRequest(raw), signRaw(raw));

    expect(paymentsService.applyProviderResult).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "SUCCESS",
    );
    expect(result).toEqual({ received: true });
  });

  it("sağlayıcı boşluklu/farklı biçimli JSON gönderse de ham gövde üzerinden imzayı doğrular", async () => {
    const raw = '{ "status": "SUCCESS",\n  "paymentId": "11111111-1111-1111-1111-111111111111" }';

    await controller.handleWebhook(makeRequest(raw), signRaw(raw));

    expect(paymentsService.applyProviderResult).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "SUCCESS",
    );
  });

  it("FAILED durumunu da doğru şekilde iletir", async () => {
    const raw = JSON.stringify({ paymentId: "22222222-2222-2222-2222-222222222222", status: "FAILED" });

    await controller.handleWebhook(makeRequest(raw), signRaw(raw));

    expect(paymentsService.applyProviderResult).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "FAILED",
    );
  });
});
