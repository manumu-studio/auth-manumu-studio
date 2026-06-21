// Verification token consumption for email + OTP code submissions.
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashOtpCode } from "./createToken";

type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "expired" | "invalid-code" | "max-attempts" | "already-verified" };

export async function consumeVerificationToken(email: string, code: string, password: string): Promise<ConsumeResult> {
  const identifier = email.toLowerCase().trim();
  const hashedCode = hashOtpCode(code);
  const now = new Date();
  const passwordHash = await hash(password, 10);

  const matchedResult = await prisma.$transaction(async (tx): Promise<ConsumeResult | null> => {
    const record = await tx.verificationToken.findFirst({
      where: { identifier, token: hashedCode },
    });

    if (!record) {
      return null;
    }
    if (record.expires < now) {
      return { ok: false, reason: "expired" };
    }

    const user = await tx.user.findUnique({
      where: { email: identifier },
      select: { id: true, emailVerified: true, status: true },
    });
    if (!user) return { ok: false, reason: "not-found" };
    if (user.emailVerified) return { ok: false, reason: "already-verified" };
    if (user.status !== "INACTIVE") return { ok: false, reason: "already-verified" };

    const activated = await tx.user.updateMany({
      where: { id: user.id, status: "INACTIVE", emailVerified: null },
      data: {
        passwordHash,
        password: null,
        hasPasswordCredential: true,
        emailVerified: now,
        status: "ACTIVE",
        sessionVersion: { increment: 1 },
      },
    });

    if (activated.count !== 1) {
      return { ok: false, reason: "already-verified" };
    }

    const consumed = await tx.verificationToken.deleteMany({
      where: { identifier, token: hashedCode, expires: { gt: now } },
    });

    if (consumed.count !== 1) {
      throw new Error("VERIFICATION_TOKEN_CONSUME_RACE");
    }

    return { ok: true };
  });

  if (matchedResult) {
    return matchedResult;
  }

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
