# ENTRY-21 — Fix OAuth Signup Redirect

**Date:** 2025-03-05
**Type:** Fix
**Branch:** `fix/oauth-signup-redirect`
**Version:** `1.8.3`
**PR:** `docs/pull-requests/PR-fix-oauth-signup-redirect.md`

---

## What I Did

Fixed the OAuth signup flow so users who create a new account from federated clients (LSA, Careerkit) are redirected back to the originating app instead of landing on the auth server dashboard.

## Root Cause

The sign-in page received `callbackUrl` correctly, but when a new account was created the signup flow navigated through intermediate pages that dropped it: signup → `/verify` → `/verify/success` → `/` → sign-in. By the time the user reached sign-in, `callbackUrl` was gone.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/features/auth/components/OtpVerificationForm/useOtpVerificationForm.ts` | Modified | Redirect to `/verify/success?callbackUrl=...` instead of direct callbackUrl/dashboard |

## Decisions

- **Preserve success page in flow** — OTP verification creates a session, but we redirect to `/verify/success` so the full chain (success → sign-in → callbackUrl) completes; the sign-in page handles the final redirect when the user is already authenticated
- **URLSearchParams for encoding** — `callbackUrl` contains nested query params; manual string interpolation would risk double-encoding
- **No change when callbackUrl absent** — Direct signup (no OAuth) behaves identically to before

## Still Open (known gaps)

None.

## Validation (commands + results)

```
pnpm tsc --noEmit   # 0 errors
pnpm build          # Success
pnpm run lint       # No violations
```
