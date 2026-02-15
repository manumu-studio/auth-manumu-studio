/**
 * Server action: reset password
 *
 * Validates token + new password, rate-limits by IP, consumes the reset token,
 * and updates the user's password atomically.
 *
 * @module auth/server/actions/resetPassword
 */

"use server";

import { headers } from "next/headers";
import { consumePasswordResetToken } from "@/features/auth/server/reset/consumeResetToken";
import { buildRateLimitKey, getRequestIp, rateLimit } from "@/lib/rateLimit";
import { resetPasswordSchema } from "@/lib/validation/reset";
import type { ActionResult } from "./types";

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  // 1. Validate input
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token")?.toString(),
    password: formData.get("password")?.toString(),
    confirmPassword: formData.get("confirmPassword")?.toString(),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      errors: {
        formErrors: flat.formErrors?.length ? flat.formErrors : [parsed.error.issues[0]?.message ?? "Invalid input"],
        fieldErrors: flat.fieldErrors,
      },
    };
  }

  const { token, password } = parsed.data;

  // 2. Rate limiting — prevents brute-force and CPU exhaustion via bcrypt
  const ip = getRequestIp(await headers());
  const identifier = buildRateLimitKey({ scope: "password_reset_consume", ip });
  const limitResult = await rateLimit(identifier);

  if (!limitResult.success) {
    return { ok: false, errors: { formErrors: ["Too many attempts. Please try again later."] } };
  }

  // 3. Consume token + update password
  const result = await consumePasswordResetToken(token, password);

  if (!result.ok) {
    const errorMap: Record<string, string> = {
      "not-found": "Invalid or expired reset link.",
      "expired": "Reset link has expired. Please request a new one.",
    };
    return {
      ok: false,
      errors: {
        formErrors: [errorMap[result.reason] ?? "Unable to reset password."],
      },
    };
  }

  return { ok: true };
}
