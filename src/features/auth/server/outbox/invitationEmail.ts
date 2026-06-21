// Invitation email delivery for Packet 02 outbox events.
import { Resend } from "resend";
import { env } from "@/lib/env";

const resendKey = env.RESEND_API_KEY;
const from = env.RESEND_FROM || "Acme <onboarding@resend.dev>";
const resend = resendKey ? new Resend(resendKey) : null;

export type SendInvitationEmailArgs = {
  to: string;
  inviteUrl: string;
  name?: string;
};

function buildInvitationText(args: SendInvitationEmailArgs): string {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  return `${greeting}\n\nYou've been invited to create your account.\n\nAccept invitation: ${args.inviteUrl}\n\nIf you were not expecting this, you can ignore this email.`;
}

function buildInvitationHtml(args: SendInvitationEmailArgs): string {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  return `<p>${greeting}</p><p>You've been invited to create your account.</p><p><a href="${args.inviteUrl}">Accept invitation</a></p><p>If you were not expecting this, you can ignore this email.</p>`;
}

export async function sendInvitationEmail(args: SendInvitationEmailArgs): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === "development") {
      console.log("[DEV EMAIL] Invitation delivery suppressed; token-bearing URL not logged.");
    }
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to: [args.to],
    subject: "You're invited to ManuMu Studio",
    text: buildInvitationText(args),
    html: buildInvitationHtml(args),
  });

  if (error) throw new Error("EMAIL_SEND_FAILED");
}
