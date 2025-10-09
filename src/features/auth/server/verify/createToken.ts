import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TTL_MIN = Number(process.env.VERIFY_TOKEN_TTL_MINUTES ?? 30);
const APP_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function createVerificationToken(email: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TTL_MIN * 60 * 1000);

  await prisma.verificationToken.create({
    data: { identifier: email.toLowerCase().trim(), token, expires },
  });

  const verifyUrl = `${APP_URL}/verify?token=${encodeURIComponent(token)}`;
  return { ok: true as const, token, verifyUrl };
}
