# Verification Email

`provider.ts` sends HTML and text OTP emails through Resend.

- Production: requires `RESEND_API_KEY` and `RESEND_FROM`.
- Development without Resend: logs the generated message to the local console.
- SMTP, Facebook, and Apple providers are not implemented.
