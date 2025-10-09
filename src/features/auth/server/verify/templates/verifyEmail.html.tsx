export const verifyEmailHtml = ({ name, verifyUrl }: { name?: string; verifyUrl: string }) => `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
    <p>${name ? `Hi ${name},` : "Hi,"}</p>
    <p>Please confirm your email by clicking the button below:</p>
    <p><a href="${verifyUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Verify email</a></p>
    <p>If the button doesn't work, copy & paste this link:</p>
    <p><code>${verifyUrl}</code></p>
    <p>Thanks!</p>
  </div>
`;
