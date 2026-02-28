// Plain-text template for email verification with a 6-digit OTP code.
export function getVerificationEmailText({ name, code }: { name?: string; code: string }) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `${greeting}

Your verification code is: ${code}

This code expires in 10 minutes.

If you didn't request this, you can safely ignore this email.

Thanks!`;
}
