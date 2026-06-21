import { NextResponse } from "next/server";
import { resendVerificationToken } from "@/features/auth/server/verify/resend";
import { createGenericAdmissionFailure } from "@/features/auth/server/admission";
import { resendSchema } from "@/lib/validation/verify";
import { buildAdmissionRateLimitChecks, getClientIp, rateLimit } from "@/lib/rateLimit";

const genericAdmissionResponse = () => {
  const failure = createGenericAdmissionFailure(200);
  return NextResponse.json(failure.body, { status: failure.status });
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) return genericAdmissionResponse();

  const ip = getClientIp(req.headers);
  const checks = buildAdmissionRateLimitChecks({
    surface: "otp-verify",
    ip,
    accountIdentifier: parsed.data.email,
  });
  for (const check of checks) {
    const limitResult = await rateLimit(check.key, check.policy);
    if (!limitResult.success) return genericAdmissionResponse();
  }

  const result = await resendVerificationToken(parsed.data.email);
  if (!result.ok) return genericAdmissionResponse();

  return NextResponse.json({ ok: true });
}
