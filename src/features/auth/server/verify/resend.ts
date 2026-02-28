// Resend flow for OTP-based email verification with cooldown protections.
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/features/auth/lib/email/provider";
import { env } from "@/lib/env";
import { createVerificationToken } from "./createToken";

const TTL_MIN = env.VERIFY_TOKEN_TTL_MINUTES;
const COOLDOWN_MIN = env.VERIFY_RESEND_COOLDOWN_MINUTES;

export async function resendVerificationToken(email: string) {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return { ok: false as const, reason: "not-found" as const };
  if (user.emailVerified) return { ok: false as const, reason: "already-verified" as const };

  const recent = await prisma.verificationToken.findFirst({
    where: { identifier: normalized },
    orderBy: { expires: "desc" },
  });
  if (recent) {
    const cooldownSince = new Date(Date.now() - COOLDOWN_MIN * 60 * 1000);
    const issuedAt = new Date(recent.expires.getTime() - TTL_MIN * 60 * 1000);
    if (issuedAt > cooldownSince) {
      return { ok: false as const, reason: "cooldown" as const };
    }
  }

  const tokenResult = await createVerificationToken(normalized);
  await sendVerificationEmail({ to: normalized, code: tokenResult.code, name: user.name ?? undefined });

  return { ok: true as const };
}
