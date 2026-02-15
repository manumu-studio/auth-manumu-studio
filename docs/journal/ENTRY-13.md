# Entry 13 — Password Reset Flow

**Date:** February 15, 2026
**Type:** Authentication
**Branch:** `feature/password-reset`

---

## Summary

Implemented the complete password reset flow: request form, tokenized email link, reset form, and success/error pages. Mirrors the existing email verification architecture (create token → send email → consume token → redirect). Includes a security review pass that added rate limiting, session invalidation, HTML escaping, and token lifecycle improvements.

---

## Key Changes

1. **Schema**
   - New `PasswordResetToken` model (separate from `VerificationToken` for clearer TTL/lifecycle separation)
   - Includes `createdAt` for audit trail

2. **Token Lifecycle**
   - `createResetToken` — generates 256-bit cryptographic token, deletes existing tokens for the email before creating a new one
   - `consumeResetToken` — validates token + expiry, hashes new password, atomically updates password + deletes all tokens + invalidates all sessions

3. **Email**
   - `sendResetEmail` — Resend in production, console fallback in dev
   - HTML and text templates with configurable TTL (not hardcoded) and HTML entity escaping for user-controlled data

4. **Server Actions**
   - `requestPasswordReset` — rate-limited, anti-enumeration (always returns success), silently skips OAuth-only accounts
   - `resetPassword` — rate-limited by IP, validates input via Zod, consumes token

5. **Components (4-file pattern)**
   - `ForgotPasswordForm` — email input, client-side validation, success state with anti-enumeration messaging
   - `ResetPasswordForm` — password + confirm fields, separate form-level error display, redirects on success

6. **Route Pages**
   - `/forgot-password` — request form wrapped in AuthShell
   - `/reset-password` — token validation + reset form
   - `/reset-password/success` — confirmation with sign-in link
   - `/reset-password/error` — reason-based error messaging

7. **Security Hardening (post-review)**
   - Rate limiting on `resetPassword` action (prevents bcrypt CPU exhaustion)
   - Session invalidation after password change (clears attacker sessions)
   - HTML escaping in email templates (prevents injection via user name)
   - Old token cleanup before new token creation (prevents token accumulation)
   - Production error logging for email failures (was silenced)

---

## Files Touched

- `prisma/schema.prisma`
- `src/lib/env.ts`
- `src/lib/validation/reset.ts`
- `src/features/auth/server/reset/createResetToken.ts`
- `src/features/auth/server/reset/consumeResetToken.ts`
- `src/features/auth/server/reset/sendResetEmail.ts`
- `src/features/auth/server/reset/templates/resetEmail.subject.ts`
- `src/features/auth/server/reset/templates/resetEmail.text.ts`
- `src/features/auth/server/reset/templates/resetEmail.html.ts`
- `src/features/auth/server/actions/requestPasswordReset.ts`
- `src/features/auth/server/actions/resetPassword.ts`
- `src/features/auth/server/actions/index.ts`
- `src/features/auth/components/ForgotPasswordForm/`
- `src/features/auth/components/ResetPasswordForm/`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/reset-password/success/page.tsx`
- `src/app/(auth)/reset-password/error/page.tsx`
- `src/features/auth/components/steps/PasswordStep/PasswordStep.tsx`
- `README.md`

---

## Rationale

- **Separate `PasswordResetToken` table** — different TTL from verification tokens, clearer lifecycle semantics, independent cleanup
- **Anti-enumeration** — `requestPasswordReset` always returns success regardless of email existence, OAuth-only accounts silently ignored
- **Session invalidation on reset** — if user resets because password was compromised, attacker's active sessions must be killed
- **Old token cleanup** — only one valid reset token per email at any time; prevents DB accumulation

---

## Validation

- Lint: **Done** No errors
- Typecheck: **Done** No errors
- Build: **Pending** (migration not yet applied)
