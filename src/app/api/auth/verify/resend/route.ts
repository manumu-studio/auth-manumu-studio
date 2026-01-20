import { NextResponse } from "next/server";
import { resendVerificationToken } from "@/features/auth/server/verify/resend";
import { resendSchema } from "@/lib/validation/verify";
import { buildRateLimitKey, getRequestIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });

  const ip = getRequestIp(req.headers);
  const identifier = buildRateLimitKey({
    scope: "verify_resend",
    ip,
    email: parsed.data.email,
  });
  const limitResult = await rateLimit(identifier);
  if (!limitResult.success) {
    return NextResponse.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  }

  const result = await resendVerificationToken(parsed.data.email);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
