# ENTRY-16 — OTP Email Verification (6-Digit Code)
**Date:** 2026-02-28
**Type:** Feature
**Branch:** `feature/c-otp-verification`
**Version:** `1.6.0`

---

## What I Did

Replaced the full verification-link flow with a 6-digit OTP verification system. Credentials signup now redirects users to `/verify?email=...`, where they enter a code sent via email.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modify | Added `attempts` field to `VerificationToken` |
| `prisma/migrations/20260228183650_add_otp_attempts/migration.sql` | Create | Added attempts column with default `0` |
| `src/features/auth/server/verify/createToken.ts` | Modify | Added OTP generation + SHA-256 hashing utilities |
| `src/features/auth/server/verify/consumeToken.ts` | Modify | Switched to `(email, code)` validation and attempt tracking |
| `src/features/auth/server/verify/resend.ts` | Modify | Regenerates OTPs with cooldown handling |
| `src/features/auth/server/verify/templates/verifyEmail.html.tsx` | Modify | OTP-centered HTML template |
| `src/features/auth/server/verify/templates/verifyEmail.text.ts` | Modify | OTP-centered text template |
| `src/features/auth/lib/email/provider.ts` | Modify | Signature changed from `verifyUrl` to `code` |
| `src/features/auth/server/actions/signup.ts` | Modify | Sends OTP code |
| `src/features/auth/server/oauth/actions/signup.ts` | Modify | Sends OTP code |
| `src/app/(public)/page.tsx` | Modify | Redirects signup result to `/verify?email=...` |
| `src/features/auth/components/steps/SignupStep/SignupStep.tsx` | Modify | Removed static post-signup success message path |
| `src/features/auth/components/steps/SignupStep/SignupStep.types.ts` | Modify | Removed `signupSuccess` prop |
| `src/app/(auth)/verify/page.tsx` | Modify | Rewritten as OTP entry page using `AuthShell` |
| `src/app/(auth)/verify/success/page.tsx` | Modify | Styled success page with CTA button |
| `src/app/(auth)/verify/error/page.tsx` | Modify | Added OTP error reasons + `AuthShell` |
| `src/app/api/auth/verify/route.ts` | Create | OTP verification endpoint with rate limiting |
| `src/features/auth/components/OtpVerificationForm/` | Create | New 4-file OTP UI component |
| `src/lib/validation/verify.ts` | Modify | Added `otpVerifySchema`, removed token schema |
| `src/lib/env.ts` | Modify | Verification TTL default updated to 10 minutes |
| `tests/auth-critical-flows.verify.test.ts` | Modify | Updated test expectations for OTP behavior |
| `docs/build-packet-reports/BUILD-otp-verification-report.md` | Create | Packet execution report |

## Decisions

- Reused the existing verification token table and stored only OTP hashes for backward-compatible schema evolution.
- Enforced a maximum of 5 invalid attempts per active token before invalidation.
- Kept endpoint-level rate limiting and added token-level attempt tracking for layered abuse protection.
- Redirected signup users directly to OTP verification rather than showing static confirmation text.
- Kept resend cooldown behavior while resetting attempts via token replacement.

## Still Open

- Add dedicated route-level tests for `/api/auth/verify` and `/api/auth/verify/resend` for stricter API boundary coverage.
- Evaluate whether to set subject line to `"Your verification code"` for improved inbox scanning consistency.
- Keep LSA logout redirect URI allowlist in sync with active environments (`localhost` + production domain).

## Validation

```bash
pnpm prisma migrate dev --name add-otp-attempts
pnpm tsc --noEmit
pnpm build
pnpm lint
```

All commands passed successfully.
