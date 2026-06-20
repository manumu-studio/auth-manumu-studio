// src/lib/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters for production security"),
  OAUTH_JWT_PRIVATE_KEY: z.string().min(1).optional(),
  OAUTH_JWT_PUBLIC_KEY: z.string().min(1).optional(),
  OAUTH_JWT_KID: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(), // Vercel will set AUTH_URL/NEXTAUTH_URL
  AUTH_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  VERIFY_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  VERIFY_RESEND_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(2),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  RESET_RESEND_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(2),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(60),
  // Security hardening
  ACCOUNT_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(30),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
  MFA_ISSUER: z.string().default("ManuMu Studio"),
  HIBP_ENABLED: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  VERCEL: z.enum(["1"]).optional(),
  // OTP HMAC key — required in production, optional in dev (falls back to NEXTAUTH_SECRET)
  OTP_HMAC_SECRET: z.string().min(32).optional(),
  // Self-service registration kill switch
  SELF_SERVICE_REGISTRATION_ENABLED: z.enum(["true", "false"]).default("true"),
  // Seed-only optional fields (never set in production)
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_USER_PASSWORD: z.string().optional(),
  SEED_OAUTH_CLIENT_SECRET: z.string().optional(),
  SEED_CONFIRMATION: z.string().optional(),
});

// Production requires Upstash: the in-memory rate-limit fallback is a no-op on
// serverless (each cold start gets a fresh process), so missing Upstash creds
// silently disable rate limiting. Fail boot instead of degrading insecurely.
// Applied only on the full-validation path; the SKIP_ENV_VALIDATION path uses
// EnvSchema.partial() (a ZodObject method unavailable on the ZodEffects below).
const EnvSchemaProd = EnvSchema.superRefine((data, ctx) => {
  if (process.env.NODE_ENV === "production") {
    if (!data.UPSTASH_REDIS_REST_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["UPSTASH_REDIS_REST_URL"],
        message: "UPSTASH_REDIS_REST_URL is required in production",
      });
    }
    if (!data.UPSTASH_REDIS_REST_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["UPSTASH_REDIS_REST_TOKEN"],
        message: "UPSTASH_REDIS_REST_TOKEN is required in production",
      });
    }
    if (!data.OAUTH_JWT_PRIVATE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OAUTH_JWT_PRIVATE_KEY"],
        message: "OAUTH_JWT_PRIVATE_KEY is required in production",
      });
    }
    if (!data.OAUTH_JWT_PUBLIC_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OAUTH_JWT_PUBLIC_KEY"],
        message: "OAUTH_JWT_PUBLIC_KEY is required in production",
      });
    }
    if (!data.AUTH_URL && !data.NEXTAUTH_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_URL"],
        message: "AUTH_URL or NEXTAUTH_URL is required in production",
      });
    }
    if (!data.OTP_HMAC_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTP_HMAC_SECRET"],
        message: "OTP_HMAC_SECRET is required in production (min 32 chars)",
      });
    }
    if (data.SELF_SERVICE_REGISTRATION_ENABLED !== "false") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SELF_SERVICE_REGISTRATION_ENABLED"],
        message: 'SELF_SERVICE_REGISTRATION_ENABLED must be "false" in production until invite gating ships',
      });
    }
  }
});

const shouldSkipValidation = process.env.SKIP_ENV_VALIDATION === "true";

const normalizeEnvValue = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const rawEnv = {
  DATABASE_URL: normalizeEnvValue(process.env.DATABASE_URL),
  NEXTAUTH_SECRET: normalizeEnvValue(process.env.NEXTAUTH_SECRET),
  OAUTH_JWT_PRIVATE_KEY: normalizeEnvValue(process.env.OAUTH_JWT_PRIVATE_KEY),
  OAUTH_JWT_PUBLIC_KEY: normalizeEnvValue(process.env.OAUTH_JWT_PUBLIC_KEY),
  OAUTH_JWT_KID: normalizeEnvValue(process.env.OAUTH_JWT_KID),
  NEXTAUTH_URL: normalizeEnvValue(process.env.NEXTAUTH_URL),
  AUTH_URL: normalizeEnvValue(process.env.AUTH_URL),
  APP_URL: normalizeEnvValue(process.env.APP_URL),
  GOOGLE_CLIENT_ID: normalizeEnvValue(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: normalizeEnvValue(process.env.GOOGLE_CLIENT_SECRET),
  GITHUB_CLIENT_ID: normalizeEnvValue(process.env.GITHUB_CLIENT_ID),
  GITHUB_CLIENT_SECRET: normalizeEnvValue(process.env.GITHUB_CLIENT_SECRET),
  RESEND_API_KEY: normalizeEnvValue(process.env.RESEND_API_KEY),
  RESEND_FROM: normalizeEnvValue(process.env.RESEND_FROM),
  VERIFY_TOKEN_TTL_MINUTES: normalizeEnvValue(process.env.VERIFY_TOKEN_TTL_MINUTES),
  VERIFY_RESEND_COOLDOWN_MINUTES: normalizeEnvValue(process.env.VERIFY_RESEND_COOLDOWN_MINUTES),
  RESET_TOKEN_TTL_MINUTES: normalizeEnvValue(process.env.RESET_TOKEN_TTL_MINUTES),
  RESET_RESEND_COOLDOWN_MINUTES: normalizeEnvValue(process.env.RESET_RESEND_COOLDOWN_MINUTES),
  UPSTASH_REDIS_REST_URL: normalizeEnvValue(process.env.UPSTASH_REDIS_REST_URL),
  UPSTASH_REDIS_REST_TOKEN: normalizeEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN),
  RATE_LIMIT_MAX: normalizeEnvValue(process.env.RATE_LIMIT_MAX),
  RATE_LIMIT_WINDOW_MINUTES: normalizeEnvValue(process.env.RATE_LIMIT_WINDOW_MINUTES),
  // Security hardening
  ACCOUNT_LOCKOUT_THRESHOLD: normalizeEnvValue(process.env.ACCOUNT_LOCKOUT_THRESHOLD),
  ACCOUNT_LOCKOUT_MINUTES: normalizeEnvValue(process.env.ACCOUNT_LOCKOUT_MINUTES),
  SESSION_IDLE_TIMEOUT_MINUTES: normalizeEnvValue(process.env.SESSION_IDLE_TIMEOUT_MINUTES),
  MFA_ISSUER: normalizeEnvValue(process.env.MFA_ISSUER),
  HIBP_ENABLED: normalizeEnvValue(process.env.HIBP_ENABLED),
  VERCEL: normalizeEnvValue(process.env.VERCEL),
  OTP_HMAC_SECRET: normalizeEnvValue(process.env.OTP_HMAC_SECRET),
  SELF_SERVICE_REGISTRATION_ENABLED: normalizeEnvValue(process.env.SELF_SERVICE_REGISTRATION_ENABLED),
  SEED_ADMIN_PASSWORD: normalizeEnvValue(process.env.SEED_ADMIN_PASSWORD),
  SEED_USER_PASSWORD: normalizeEnvValue(process.env.SEED_USER_PASSWORD),
  SEED_OAUTH_CLIENT_SECRET: normalizeEnvValue(process.env.SEED_OAUTH_CLIENT_SECRET),
  SEED_CONFIRMATION: normalizeEnvValue(process.env.SEED_CONFIRMATION),
};

const parsed = (shouldSkipValidation ? EnvSchema.partial() : EnvSchemaProd).safeParse(rawEnv);
if (!parsed.success) {
  throw parsed.error;
}

export const env = parsed.data as z.infer<typeof EnvSchema>;