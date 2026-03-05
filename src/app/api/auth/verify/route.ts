// API endpoint for verifying 6-digit email OTP codes.
import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/features/auth/server/verify/consumeToken";
import { createSessionToken, getSessionCookieName } from "@/features/auth/server/createSessionToken";
import { prisma } from "@/lib/prisma";
import { otpVerifySchema } from "@/lib/validation/verify";
import { buildRateLimitKey, getRequestIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = otpVerifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const ip = getRequestIp(req.headers);
  const identifier = buildRateLimitKey({
    scope: "verify-otp",
    ip,
    email: parsed.data.email,
  });
  const limitResult = await rateLimit(identifier);
  if (!limitResult.success) {
    return NextResponse.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  }

  const result = await consumeVerificationToken(parsed.data.email, parsed.data.code);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, reason: "user-not-found" }, { status: 404 });
  }

  const sessionToken = await createSessionToken(user);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
  return response;
}
