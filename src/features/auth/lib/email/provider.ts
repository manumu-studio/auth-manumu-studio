// src/features/auth/lib/email/provider.ts
import { Resend } from "resend";
import { getVerificationEmailSubject } from "@/features/auth/server/verify/templates/verifyEmail.subject";
import { getVerificationEmailText } from "@/features/auth/server/verify/templates/verifyEmail.text";
import { verifyEmailHtml } from "@/features/auth/server/verify/templates/verifyEmail.html";

const resendKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM || "Acme <onboarding@resend.dev>";
const resend = resendKey ? new Resend(resendKey) : null;

type SendArgs = { to: string; verifyUrl: string; name?: string };

export async function sendVerificationEmail({ to, verifyUrl, name }: SendArgs) {
  const subject = getVerificationEmailSubject();
  const text = getVerificationEmailText({ name, verifyUrl });
  const html = verifyEmailHtml({ name, verifyUrl });

  // quick visibility to ensure envs are loaded at runtime
  console.log("[EMAIL] resend?", Boolean(resendKey), "from:", from);

  if (resend) {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to], // normalize
      subject,
      text,
      html,
    });

    if (error) {
      console.error("[Resend] send error:", error);
      throw new Error("EMAIL_SEND_FAILED");
    }

    console.log("[Resend] sent id:", data?.id);
    return;
  }

  // Fallback for dev
  console.log("[DEV EMAIL] To:", to, "\nSubject:", subject, "\n\n", text);
}