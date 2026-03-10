import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  EVENT_NAME: z.string().min(1).default("Event Registration MVP"),
  EVENT_CODE: z.string().min(1).default("default"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
  TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS: z.coerce.number().int().min(60).max(604800).default(86400),
  QR_SIGNING_SECRET: z.string().min(16),
  STAFF_PASSWORD: z.string().min(8),
  STAFF_AUTH_SECRET: z.string().min(16),
  TELEGRAM_LINK_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(10080).default(1440),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().min(1).max(500).default(12),
  RATE_LIMIT_REGISTER_WINDOW_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
  RATE_LIMIT_REGISTRATION_STATUS_MAX: z.coerce.number().int().min(1).max(1000).default(90),
  RATE_LIMIT_REGISTRATION_STATUS_WINDOW_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
  RATE_LIMIT_STAFF_LOGIN_MAX: z.coerce.number().int().min(1).max(200).default(15),
  RATE_LIMIT_STAFF_LOGIN_WINDOW_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  RATE_LIMIT_STAFF_CHECKIN_MAX: z.coerce.number().int().min(30).max(5000).default(360),
  RATE_LIMIT_STAFF_CHECKIN_WINDOW_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
  RATE_LIMIT_TELEGRAM_WEBHOOK_MAX: z.coerce.number().int().min(30).max(5000).default(300),
  RATE_LIMIT_TELEGRAM_WEBHOOK_WINDOW_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
});

type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
