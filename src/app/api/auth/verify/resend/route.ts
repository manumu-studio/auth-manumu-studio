import { NextResponse } from "next/server";
import { resendVerificationToken } from "@/features/auth/server/verify/resend";
import { resendSchema } from "@/lib/validation/verify";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });

  const result = await resendVerificationToken(parsed.data.email);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
