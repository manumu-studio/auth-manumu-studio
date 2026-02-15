/**
 * Password reset token creation
 *
 * Generates cryptographically secure tokens for password reset.
 * Tokens are stored in the database with a configurable TTL.
 *
 * @module auth/server/reset/createResetToken
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// Token expiration time (default: 30 minutes)
const TTL_MIN = env.RESET_TOKEN_TTL_MINUTES;
// Application URL for reset links
const APP_URL = env.APP_URL || env.NEXTAUTH_URL || env.AUTH_URL || "http://localhost:3000";

/**
 * Creates a password reset token
 *
 * Generates a cryptographically secure 32-byte token (256 bits) using
 * Node.js crypto.randomBytes(), encoded as base64url for URL safety.
 *
 * @param email - User email address (normalized as identifier)
 * @returns Object containing token and reset URL
 */
export async function createPasswordResetToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // Generate cryptographically secure random token (32 bytes = 256 bits)
  const token = crypto.randomBytes(32).toString("base64url");

  // Calculate expiration time
  const expires = new Date(Date.now() + TTL_MIN * 60 * 1000);

  // Delete any existing tokens for this email before creating a new one
  await prisma.passwordResetToken.deleteMany({
    where: { identifier: normalizedEmail },
  });

  await prisma.passwordResetToken.create({
    data: { identifier: normalizedEmail, token, expires },
  });

  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return { ok: true as const, token, resetUrl, ttlMinutes: TTL_MIN };
}
