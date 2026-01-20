// src/lib/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters for production security"),
  NEXTAUTH_URL: z.string().url().optional(), // Vercel will set AUTH_URL/NEXTAUTH_URL
  AUTH_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  VERIFY_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  VERIFY_RESEND_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(2),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(60),
});

const shouldSkipValidation = process.env.SKIP_ENV_VALIDATION === "true";

const rawEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  AUTH_URL: process.env.AUTH_URL,
  APP_URL: process.env.APP_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM,
  VERIFY_TOKEN_TTL_MINUTES: process.env.VERIFY_TOKEN_TTL_MINUTES,
  VERIFY_RESEND_COOLDOWN_MINUTES: process.env.VERIFY_RESEND_COOLDOWN_MINUTES,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MINUTES: process.env.RATE_LIMIT_WINDOW_MINUTES,
};

const parsed = (shouldSkipValidation ? EnvSchema.partial() : EnvSchema).safeParse(rawEnv);
if (!parsed.success) {
  throw parsed.error;
}

export const env = parsed.data as z.infer<typeof EnvSchema>;