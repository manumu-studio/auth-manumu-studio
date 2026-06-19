# Auth Feature

Authentication and OAuth/OIDC vertical slice.

## Structure

- `components/` — forgot/reset/OTP forms, social buttons, auth steps.
- `server/actions/` — signup, sign-in, password-reset actions.
- `server/providers/` — Google and GitHub provider factories.
- `server/verify/` — OTP issue, resend, and consumption.
- `server/reset/` — password-reset token lifecycle and email templates.
- `server/oauth/` — client registry, authorize validation, code exchange,
  signing, claims, issuer resolution.
- `server/options.ts` — NextAuth configuration.
- `server/createSessionToken.ts` — post-verification session JWT.
- `lib/email/` — Resend verification delivery.
- `types/` — NextAuth session/JWT augmentation.

External inputs must be Zod-validated. Security changes must update
`docs/SECURITY.md`, `docs/api/openapi.yaml`, tests, and Incident P001 when
applicable.
