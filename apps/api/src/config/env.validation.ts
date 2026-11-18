import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL zorunlu"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET en az 16 karakter olmalı"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET en az 16 karakter olmalı"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  // Virgülle ayrılmış izinli web origin listesi (CORS). credentials:true ile birlikte
  // origin:true kullanmak herhangi bir siteden kimlik bilgili istek yapılmasına izin
  // verdiği için (gerçek bir CSRF riski) burada açıkça whitelist tutulur.
  WEB_ORIGIN: z.string().default("http://localhost:3000,http://localhost:8081"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  // Checkout URL'lerini oluştururken kullanılan tek bir kanonik web app adresi
  // (WEB_ORIGIN bir CORS whitelist'i, buradaki amaç farklı).
  WEB_APP_URL: z.string().default("http://localhost:3000"),
  // Ödeme webhook'unu imzalamak/doğrulamak için paylaşılan secret. Gerçek bir
  // sağlayıcıya (iyzico/PayTR) geçildiğinde bu, o sağlayıcının kendi imza şemasıyla
  // değiştirilecek.
  PAYMENT_WEBHOOK_SECRET: z.string().default("dev-payment-webhook-secret-please-change-me"),
  // Resend API anahtarı henüz yoksa (dev ortamı) e-postalar konsola loglanır (bkz. mail/mail.module.ts).
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("Fit Sihirbaz <onboarding@resend.dev>"),
  // Mock ödeme sonucunu (payments.simulateOutcome) açar/kapatır. Verilmezse geliştirmede açık,
  // production'da kapalıdır; gerçek bir sağlayıcı gelene kadar canlıda ödeme alınamaz.
  ALLOW_MOCK_PAYMENTS: z.enum(["true", "false"]).optional(),
});

const PLACEHOLDER_SECRET_PATTERN = /change-?me|please-change|dev-payment/i;

const ProductionCheckedEnvSchema = EnvSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") {
    return;
  }
  // .env.example'daki yer tutucu değerler 16 karakter sınırını geçtiği için production'da
  // yanlışlıkla bu değerlerle ayağa kalkmak mümkündü; açıkça reddedilir.
  const secrets = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "PAYMENT_WEBHOOK_SECRET"] as const;
  for (const key of secrets) {
    if (PLACEHOLDER_SECRET_PATTERN.test(env[key])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} production'da yer tutucu bir değer olamaz` });
    }
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["JWT_REFRESH_SECRET"], message: "Access ve refresh secret farklı olmalı" });
  }
}).transform((env) => ({
  ...env,
  ALLOW_MOCK_PAYMENTS:
    env.ALLOW_MOCK_PAYMENTS === undefined ? env.NODE_ENV !== "production" : env.ALLOW_MOCK_PAYMENTS === "true",
}));

export type Env = z.infer<typeof ProductionCheckedEnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = ProductionCheckedEnvSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Geçersiz ortam değişkenleri:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
