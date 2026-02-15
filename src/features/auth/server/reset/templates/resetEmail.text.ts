// Password reset email — plain text version
export function getPasswordResetEmailText({ name, resetUrl, ttlMinutes }: { name?: string; resetUrl: string; ttlMinutes: number }) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `${greeting}

You requested to reset your password. Click the link below to set a new password:

${resetUrl}

This link expires in ${ttlMinutes} minutes.

If you didn't request this, you can safely ignore this email.

Thanks!`;
}
