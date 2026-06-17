import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
  SUPABASE_PROJECT_REF: z.string().min(1).optional(),

  // DB
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  NEON_PROJECT_ID: z.string().min(1).optional(),

  // Encryption (64-char hex == 32 bytes)
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex chars (32 bytes)"),

  // Google
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  GBP_LIVE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(), // optional when AI_LIVE=false
  OPENAI_MODEL_PRIMARY: z.string().default("gpt-4o"),
  OPENAI_MODEL_CLASSIFIER: z.string().default("gpt-4o-mini"),
  AI_LIVE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().min(1),
  STRIPE_PRICE_STARTER_YEARLY: z.string().min(1),
  STRIPE_PRICE_GROWTH_MONTHLY: z.string().min(1),
  STRIPE_PRICE_GROWTH_YEARLY: z.string().min(1),
  STRIPE_PRICE_PRO_MONTHLY: z.string().min(1),
  STRIPE_PRICE_PRO_YEARLY: z.string().min(1),

  // Resend
  RESEND_API_KEY: z.string().optional(), // optional when EMAIL_LIVE=false
  RESEND_FROM_EMAIL: z.string().email().default("hello@autofivestar.com"),
  SUPPORT_EMAIL: z.string().email().default("support@autofivestar.com"),
  EMAIL_LIVE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Twilio (optional unless SMS_LIVE=true)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  SMS_LIVE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Yelp (optional in dev)
  YELP_API_KEY: z.string().optional(),

  // Upstash
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),

  // Sentry (server-side)
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("AutoFiveStar"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const skipValidation =
  process.env.SKIP_ENV_VALIDATION === "true" || process.env.npm_lifecycle_event === "lint";

function parseServer() {
  if (skipValidation) return process.env as unknown as z.infer<typeof serverSchema>;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid server env:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
}

function parseClient() {
  const raw = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
  if (skipValidation) return raw as unknown as z.infer<typeof clientSchema>;
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Invalid client env:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }
  return parsed.data;
}

export const env =
  typeof window === "undefined"
    ? { ...parseServer(), ...parseClient() }
    : (parseClient() as unknown as ReturnType<typeof parseServer> &
        ReturnType<typeof parseClient>);

export type Env = typeof env;
