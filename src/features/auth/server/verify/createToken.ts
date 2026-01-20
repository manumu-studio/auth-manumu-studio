/**
 * Email verification token creation
 * 
 * Generates cryptographically secure tokens for email verification.
 * Tokens are stored in the database with a configurable TTL.
 * 
 * @module auth/server/verify/createToken
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// Token expiration time (default: 30 minutes)
const TTL_MIN = env.VERIFY_TOKEN_TTL_MINUTES;
// Application URL for verification links
const APP_URL = env.APP_URL || env.NEXTAUTH_URL || env.AUTH_URL || "http://localhost:3000";

/**
 * Creates a verification token for email verification
 * 
 * Generates a cryptographically secure 32-byte token (256 bits) using
 * Node.js crypto.randomBytes(), encoded as base64url for URL safety.
 * 
 * @param {string} email - User email address (normalized as identifier)
 * @returns {Promise<Object>} Object containing token and verification URL
 * 
 * @example
 * ```ts
 * const { token, verifyUrl } = await createVerificationToken("user@example.com");
 * // Send verifyUrl to user via email
 * ```
 */
export async function createVerificationToken(email: string) {
  // Generate cryptographically secure random token (32 bytes = 256 bits)
  // base64url encoding ensures URL-safe characters
  const token = crypto.randomBytes(32).toString("base64url");
  
  // Calculate expiration time (TTL in minutes)
  const expires = new Date(Date.now() + TTL_MIN * 60 * 1000);

  await prisma.verificationToken.create({
    data: { identifier: email.toLowerCase().trim(), token, expires },
  });

  const verifyUrl = `${APP_URL}/verify?token=${encodeURIComponent(token)}`;
  return { ok: true as const, token, verifyUrl };
}
