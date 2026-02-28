# PR-1.6.0 — OTP Email Verification (6-Digit Code)
**Branch:** `feature/c-otp-verification` → `main`
**Version:** `1.6.0`
**Date:** 2026-02-28
**Status:** ✅ Ready to merge

---

## Summary

Replaces link-based email verification with a 6-digit OTP flow. Signup now redirects users to an OTP verification page, verification tokens store only SHA-256 code hashes, and the flow enforces both request rate limiting and max-attempt token invalidation.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Added `VerificationToken.attempts` |
| `prisma/migrations/20260228183650_add_otp_attempts/migration.sql` | Created | Migration for attempts tracking |
| `src/features/auth/server/verify/createToken.ts` | Modified | OTP generation + hash storage |
| `src/features/auth/server/verify/consumeToken.ts` | Modified | Email+code consume flow with attempts logic |
| `src/features/auth/server/verify/resend.ts` | Modified | Reissue OTP with cooldown |
| `src/features/auth/server/verify/templates/verifyEmail.html.tsx` | Modified | OTP code email content |
| `src/features/auth/server/verify/templates/verifyEmail.text.ts` | Modified | OTP text email content |
| `src/features/auth/lib/email/provider.ts` | Modified | Provider signature uses `code` |
| `src/features/auth/server/actions/signup.ts` | Modified | Sends OTP code |
| `src/features/auth/server/oauth/actions/signup.ts` | Modified | Sends OTP code |
| `src/app/(public)/page.tsx` | Modified | Redirect to `/verify?email=...` on signup success |
| `src/features/auth/components/steps/SignupStep/SignupStep.tsx` | Modified | Removed static success message branch |
| `src/features/auth/components/steps/SignupStep/SignupStep.types.ts` | Modified | Removed obsolete `signupSuccess` prop |
| `src/app/(auth)/verify/page.tsx` | Modified | OTP verify page with `AuthShell` |
| `src/app/(auth)/verify/success/page.tsx` | Modified | Styled success screen + sign-in CTA |
| `src/app/(auth)/verify/error/page.tsx` | Modified | OTP-specific error messaging |
| `src/app/api/auth/verify/route.ts` | Created | New OTP verify API |
| `src/features/auth/components/OtpVerificationForm/` | Created | New OTP UI component set |
| `src/lib/validation/verify.ts` | Modified | Added `otpVerifySchema`, removed old token schema |
| `src/lib/env.ts` | Modified | Default verify TTL = 10 minutes |
| `tests/auth-critical-flows.verify.test.ts` | Modified | OTP flow tests aligned to new signatures |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Store SHA-256 hash of OTP, never plaintext | Reduces risk if token table is exposed |
| Keep one active token per email by deleting old tokens on issue/resend | Avoids ambiguity and stale-code acceptance |
| Add `attempts` counter in `VerificationToken` | Enables deterministic lockout after repeated bad codes |
| Keep dual protection (rate limit + attempts cap) | Defends against brute-force and burst abuse |
| Redirect signup users to OTP page immediately | Removes dead-end confirmation UI and shortens path to verification |

## Test Plan

- [x] Signup sends OTP email (no verify link fallback)
- [x] Verify page accepts `?email=...` and renders OTP form
- [x] Correct OTP verifies user and redirects to success
- [x] Invalid OTP returns error and allows retry
- [x] 5 invalid attempts invalidates active token (`max-attempts`)
- [x] Resend endpoint issues fresh OTP and preserves cooldown guard
- [x] Type/build/lint gates pass

## Validation

Commands run:

```bash
pnpm prisma migrate dev --name add-otp-attempts
pnpm tsc --noEmit
pnpm build
pnpm lint
```

Results:
- Migration: ✅
- Typecheck: ✅
- Build: ✅
- Lint: ✅

## Deployment Notes

- Prisma migration required (`add_otp_attempts`) before production rollout.
- No new required environment variables.
- Existing unverified users with old link-style tokens will need to request a new OTP code.
- LSA logout redirect URIs must remain registered exactly:
  - `http://localhost:3000`
  - `https://lsa.manumustudio.com`
