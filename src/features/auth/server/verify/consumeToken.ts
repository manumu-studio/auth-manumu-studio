import { prisma } from "@/lib/prisma";

export async function consumeVerificationToken(token: string) {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) return { ok: false as const, reason: "not-found" as const };
  if (record.expires < new Date()) return { ok: false as const, reason: "expired" as const };

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true, emailVerified: true },
  });
  if (!user) return { ok: false as const, reason: "not-found" as const };
  if (user.emailVerified) return { ok: false as const, reason: "already-verified" as const };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
  ]);

  return { ok: true as const };
}
