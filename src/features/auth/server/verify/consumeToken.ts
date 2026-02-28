// Verification token consumption for email + OTP code submissions.
import { prisma } from "@/lib/prisma";
import { hashOtpCode } from "./createToken";

type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "expired" | "invalid-code" | "max-attempts" | "already-verified" };

export async function consumeVerificationToken(email: string, code: string): Promise<ConsumeResult> {
  const identifier = email.toLowerCase().trim();
  const hashedCode = hashOtpCode(code);
  const now = new Date();

  const record = await prisma.verificationToken.findFirst({
    where: { identifier, token: hashedCode },
  });

  if (!record) {
    const activeToken = await prisma.verificationToken.findFirst({
      where: { identifier, expires: { gt: now } },
      orderBy: { expires: "desc" },
    });

    if (!activeToken) {
      return { ok: false, reason: "not-found" };
    }

    const updated = await prisma.verificationToken.update({
      where: { token: activeToken.token },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });

    if (updated.attempts >= 5) {
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return { ok: false, reason: "max-attempts" };
    }

    return { ok: false, reason: "invalid-code" };
  }

  if (record.expires < now) {
    return { ok: false, reason: "expired" };
  }

  const user = await prisma.user.findUnique({
    where: { email: identifier },
    select: { id: true, emailVerified: true },
  });
  if (!user) return { ok: false, reason: "not-found" };
  if (user.emailVerified) return { ok: false, reason: "already-verified" };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier } }),
  ]);

  return { ok: true };
}
