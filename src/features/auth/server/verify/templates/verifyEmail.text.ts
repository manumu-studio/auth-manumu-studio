export function getVerificationEmailText({ name, verifyUrl }: { name?: string; verifyUrl: string }) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `${greeting}

Please confirm your email by clicking the link below:

${verifyUrl}

If you didn’t request this, you can safely ignore this email.

Thanks!`;
}
