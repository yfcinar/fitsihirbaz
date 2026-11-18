import { validateEnv } from "./env.validation";

const BASE = {
  DATABASE_URL: "postgresql://localhost/test",
  JWT_ACCESS_SECRET: "a-very-long-access-secret-value",
  JWT_REFRESH_SECRET: "a-very-long-refresh-secret-value",
  PAYMENT_WEBHOOK_SECRET: "a-very-long-webhook-secret-value",
};

describe("validateEnv", () => {
  it("geliştirmede mock ödemeler varsayılan olarak açıktır", () => {
    expect(validateEnv({ ...BASE, NODE_ENV: "development" }).ALLOW_MOCK_PAYMENTS).toBe(true);
  });

  it("production'da mock ödemeler varsayılan olarak kapalıdır", () => {
    expect(validateEnv({ ...BASE, NODE_ENV: "production" }).ALLOW_MOCK_PAYMENTS).toBe(false);
  });

  it("production'da ALLOW_MOCK_PAYMENTS=true ile açıkça açılabilir", () => {
    expect(validateEnv({ ...BASE, NODE_ENV: "production", ALLOW_MOCK_PAYMENTS: "true" }).ALLOW_MOCK_PAYMENTS).toBe(true);
  });

  it("production'da yer tutucu JWT secret'ını reddeder", () => {
    expect(() =>
      validateEnv({ ...BASE, NODE_ENV: "production", JWT_ACCESS_SECRET: "change-me-access-secret" }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("production'da varsayılan webhook secret'ı ile açılmayı reddeder", () => {
    const { PAYMENT_WEBHOOK_SECRET: _omitted, ...withoutWebhookSecret } = BASE;
    expect(() => validateEnv({ ...withoutWebhookSecret, NODE_ENV: "production" })).toThrow(/PAYMENT_WEBHOOK_SECRET/);
  });

  it("production'da access ve refresh secret aynıysa reddeder", () => {
    expect(() =>
      validateEnv({ ...BASE, NODE_ENV: "production", JWT_REFRESH_SECRET: BASE.JWT_ACCESS_SECRET }),
    ).toThrow(/farklı olmalı/);
  });

  it("geliştirmede yer tutucu secret'lara izin verir", () => {
    expect(() =>
      validateEnv({ ...BASE, NODE_ENV: "development", JWT_ACCESS_SECRET: "change-me-access-secret" }),
    ).not.toThrow();
  });
});
