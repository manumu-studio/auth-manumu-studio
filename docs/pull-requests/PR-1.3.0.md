# PR-1.3.0 — Password Reset Flow

**Date:** February 15, 2026
**Branch:** `feature/password-reset`
**Type:** Authentication (Priority 1 Feature)

---

## Summary

Implements the complete password reset flow — from "Forgot password?" link to token-based email reset and success confirmation. Mirrors the existing email verification architecture for consistency. Includes a full security review pass with fixes for rate limiting, session invalidation, and HTML injection prevention.

---

## Scope

- Request reset form at `/forgot-password` with anti-enumeration protection
- Tokenized email link with configurable TTL and HTML-safe templates
- Reset form at `/reset-password` with Zod validation and rate limiting
- Success and error pages with reason-based messaging
- "Forgot password?" link on the existing PasswordStep component
- Security hardening: session invalidation, token cleanup, HTML escaping

---

## Changes

- Added `PasswordResetToken` Prisma model with `createdAt` audit field
- Added `RESET_TOKEN_TTL_MINUTES` and `RESET_RESEND_COOLDOWN_MINUTES` env vars
- Added Zod schemas for request reset and reset password validation
- Added token lifecycle: `createResetToken` (with old token cleanup) and `consumeResetToken` (with session invalidation)
- Added email sending via Resend with HTML-escaped templates and configurable TTL display
- Added `requestPasswordReset` server action with rate limiting and anti-enumeration
- Added `resetPassword` server action with IP-based rate limiting
- Added `ForgotPasswordForm` and `ResetPasswordForm` components (4-file pattern)
- Added route pages: `/forgot-password`, `/reset-password`, `/reset-password/success`, `/reset-password/error`
- Modified `PasswordStep` to include "Forgot password?" link
- Updated `README.md` with roadmap checkbox and feature bullet

---

## Testing

- `pnpm typecheck`: pass
- `pnpm lint`: pending
- `pnpm build`: pending (requires migration)
- Manual testing: pending (requires migration + dev server)

---

## Database / Migrations

- **Required:** `pnpm prisma migrate dev --name add-password-reset-tokens`
- Adds `password_reset_tokens` table with `identifier`, `token` (unique), `expires`, `createdAt`
- Production: `pnpm prisma migrate deploy`

---

## Security Review

| Issue | Severity | Fix Applied |
|---|---|---|
| Missing rate limiting on `resetPassword` | Critical | Added IP-based rate limiting via `buildRateLimitKey` |
| No session invalidation after password change | Critical | Added `session.deleteMany` to the atomic transaction |
| HTML injection via unescaped user name in email | Critical | Added `escapeHtml` helper for template interpolation |
| Multiple valid tokens per email | Warning | Old tokens deleted before creating new one |
| Hardcoded "30 minutes" in email copy | Warning | TTL passed from env config to template functions |
| No `createdAt` on `PasswordResetToken` | Warning | Added `createdAt @default(now())` to schema |
| Silent error logging in production | Info | Changed to always use `console.error` for Resend failures |
| Form error hidden behind field error | Info | Separated form-level errors into dedicated `<p>` element |
| `.tsx` extension on non-JSX file | Info | Renamed `resetEmail.html.tsx` → `resetEmail.html.ts` |

---

## Evidence

Commands run:
- `pnpm typecheck`

---

## Known Follow-Ups (Not Blocking)

- Token cleanup cron job for expired tokens (both `PasswordResetToken` and `VerificationToken`)
- SCSS styling for forgot-password and reset-password pages
- Integration tests for the full reset flow
- Consider consuming token server-side on page load to avoid token exposure in URL/browser history

---

## Merge Status

**⏳** Pending — migration not yet applied, manual testing not yet done
