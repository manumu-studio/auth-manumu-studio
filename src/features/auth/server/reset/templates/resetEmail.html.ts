// Password reset email — HTML version

// Escape HTML entities to prevent injection from user-controlled data
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const resetEmailHtml = ({ name, resetUrl, ttlMinutes }: { name?: string; resetUrl: string; ttlMinutes: number }) => `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
    <p>${name ? `Hi ${escapeHtml(name)},` : "Hi,"}</p>
    <p>You requested to reset your password. Click the button below to set a new password:</p>
    <p><a href="${resetUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Reset password</a></p>
    <p style="color:#666;font-size:14px">This link expires in ${ttlMinutes} minutes.</p>
    <p>If the button doesn't work, copy &amp; paste this link:</p>
    <p><code>${resetUrl}</code></p>
    <p style="color:#666;font-size:14px">If you didn't request this, you can safely ignore this email.</p>
    <p>Thanks!</p>
  </div>
`;
