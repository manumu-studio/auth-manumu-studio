// Verification token creation utilities for 6-digit OTP email verification.
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// Token expiration time in minutes (default from env, expected 10)
const TTL_MIN = env.VERIFY_TOKEN_TTL_MINUTES;

// Generate 6-digit numeric code (000000-999999)
function generateOtpCode(): string {
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(6, "0");
}

// Hash the code for storage (never store plaintext OTPs)
export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function createVerificationToken(email: string) {
  const identifier = email.toLowerCase().trim();
  const code = generateOtpCode();
  const token = hashOtpCode(code);
  const expires = new Date(Date.now() + TTL_MIN * 60 * 1000);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token, expires, attempts: 0 },
    }),
  ]);

  return { ok: true as const, code };
}
