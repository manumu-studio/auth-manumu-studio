// HTML template for email verification with a 6-digit OTP code.
export const verifyEmailHtml = ({ name, code }: { name?: string; code: string }) => `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial; max-width:480px; margin:0 auto;">
    <p>${name ? `Hi ${name},` : "Hi,"}</p>
    <p>Your verification code is:</p>
    <div style="text-align:center; margin:24px 0;">
      <span style="font-size:32px; font-weight:bold; letter-spacing:8px; background:#f4f4f5; padding:16px 24px; border-radius:8px; font-family:monospace; display:inline-block;">
        ${code}
      </span>
    </div>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  </div>
`;
