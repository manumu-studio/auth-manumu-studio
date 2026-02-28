// API endpoint for verifying 6-digit email OTP codes.
import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/features/auth/server/verify/consumeToken";
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
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
