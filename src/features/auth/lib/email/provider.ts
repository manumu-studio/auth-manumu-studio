/**
 * Email provider for sending verification emails
 * 
 * Uses Resend for email delivery in production, with console logging
 * fallback for development when Resend is not configured.
 * 
 * @module auth/lib/email/provider
 */

import { Resend } from "resend";
import { getVerificationEmailSubject } from "@/features/auth/server/verify/templates/verifyEmail.subject";
import { getVerificationEmailText } from "@/features/auth/server/verify/templates/verifyEmail.text";
import { verifyEmailHtml } from "@/features/auth/server/verify/templates/verifyEmail.html";
import { env } from "@/lib/env";

// Resend API key (optional - falls back to console logging if not set)
const resendKey = env.RESEND_API_KEY;
// Sender email address (defaults to Resend onboarding address)
const from = env.RESEND_FROM || "Acme <onboarding@resend.dev>";
// Initialize Resend client only if API key is provided
const resend = resendKey ? new Resend(resendKey) : null;

type SendArgs = { to: string; verifyUrl: string; name?: string };

/**
 * Sends a verification email to the user
 * 
 * Sends both HTML and plain text versions of the verification email.
 * Falls back to console logging in development if Resend is not configured.
 * 
 * @param {SendArgs} args - Email parameters
 * @param {string} args.to - Recipient email address
 * @param {string} args.verifyUrl - Verification link URL
 * @param {string} [args.name] - Optional recipient name
 * @throws {Error} "EMAIL_SEND_FAILED" if Resend returns an error
 * 
 * @example
 * ```ts
 * await sendVerificationEmail({
 *   to: "user@example.com",
 *   verifyUrl: "https://app.com/verify?token=...",
 *   name: "John Doe"
 * });
 * ```
 */
export async function sendVerificationEmail({ to, verifyUrl, name }: SendArgs) {
  // Generate email content (subject, plain text, HTML)
  const subject = getVerificationEmailSubject();
  const text = getVerificationEmailText({ name, verifyUrl });
  const html = verifyEmailHtml({ name, verifyUrl });

  // Environment-aware logging (only in development)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const log = isDevelopment ? console.log : () => {};
  const logError = isDevelopment ? console.error : () => {};

  // Production: Send via Resend if configured
  if (resend) {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to], // Normalize to array format
      subject,
      text,
      html,
    });

    if (error) {
      logError("[Resend] send error:", error);
      throw new Error("EMAIL_SEND_FAILED");
    }

    // Log email ID for tracking (development only)
    log("[Resend] sent id:", data?.id);
    return;
  }

  // Development fallback: Log email to console
  // This allows testing the verification flow without configuring Resend
  log("[DEV EMAIL] To:", to, "\nSubject:", subject, "\n\n", text);
}