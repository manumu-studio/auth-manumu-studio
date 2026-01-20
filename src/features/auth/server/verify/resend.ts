import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/features/auth/lib/email/provider";
import crypto from "crypto";
import { env } from "@/lib/env";

const TTL_MIN = env.VERIFY_TOKEN_TTL_MINUTES;
const COOLDOWN_MIN = env.VERIFY_RESEND_COOLDOWN_MINUTES;
const APP_URL = env.APP_URL || env.NEXTAUTH_URL || env.AUTH_URL || "http://localhost:3000";

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
    if (recent.expires > cooldownSince) {
      return { ok: false as const, reason: "cooldown" as const };
    }
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TTL_MIN * 60 * 1000);
  await prisma.verificationToken.create({
    data: { identifier: normalized, token, expires },
  });

  const verifyUrl = `${APP_URL}/verify?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail({ to: normalized, verifyUrl });

  return { ok: true as const };
}
