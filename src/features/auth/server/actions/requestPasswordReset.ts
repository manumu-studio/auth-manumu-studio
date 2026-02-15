/**
 * Server action: request password reset
 *
 * Validates email, rate-limits, generates reset token, and sends email.
 * Always returns success to prevent email enumeration attacks.
 *
 * @module auth/server/actions/requestPasswordReset
 */

"use server";

import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/features/auth/server/reset/createResetToken";
import { sendPasswordResetEmail } from "@/features/auth/server/reset/sendResetEmail";
import { buildRateLimitKey, getRequestIp, rateLimit } from "@/lib/rateLimit";
import { requestResetSchema } from "@/lib/validation/reset";
import { headers } from "next/headers";
import type { ActionResult } from "./types";

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  // 1. Validate input
  const parsed = requestResetSchema.safeParse({
    email: formData.get("email")?.toString(),
  });

  if (!parsed.success) {
    return { ok: false, errors: { formErrors: ["Invalid email address"] } };
  }

  const email = parsed.data.email.toLowerCase().trim();

  // 2. Rate limiting (prevents abuse)
  const ip = getRequestIp(await headers());
  const identifier = buildRateLimitKey({ scope: "password_reset", ip, email });
  const limitResult = await rateLimit(identifier);

  if (!limitResult.success) {
    return { ok: false, errors: { formErrors: ["Too many requests. Please try again later."] } };
  }

  // 3. Find user (always return success to prevent email enumeration)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, password: true },
  });

  // SECURITY: No account or OAuth-only account → still return success
  if (!user || !user.password) {
    return { ok: true };
  }

  // 4. Create reset token + send email
  try {
    const { resetUrl, ttlMinutes } = await createPasswordResetToken(email);
    await sendPasswordResetEmail({
      to: email,
      resetUrl,
      name: user.name ?? undefined,
      ttlMinutes,
    });
  } catch (error) {
    // Silent failure — don't reveal email status to client
    console.error("[Password Reset] Failed:", error);
  }

  return { ok: true };
}
