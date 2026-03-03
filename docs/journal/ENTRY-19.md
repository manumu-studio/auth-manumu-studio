# ENTRY-19 — Fix Post-Verification Redirect to Originating App

**Date:** 2026-03-03
**Type:** Fix
**Branch:** `fix/verify-callback-redirect`
**Version:** `1.8.2`
**PR:** `docs/pull-requests/PR-fix-verify-callback-redirect.md`

---

## What I Did

Threaded `callbackUrl` through the entire signup → verify → success → login flow so users are redirected back to the app that initiated the OAuth flow (Career Kit, LSA, etc.) after email verification.

## Root Cause

After signup, the app redirected to `/verify?email=...` without carrying the `callbackUrl`. After OTP verification, redirects were hardcoded to `/verify/success` → `/`, losing the originating app context entirely.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/app/(public)/page.tsx` | Modify | Pass callbackUrl to /verify via URLSearchParams |
| `src/app/(auth)/verify/page.tsx` | Modify | Accept callbackUrl from searchParams, forward to OtpVerificationForm |
| `src/app/(auth)/verify/success/page.tsx` | Modify | Read callbackUrl, include in "Sign in" link |
| `src/features/auth/components/OtpVerificationForm/OtpVerificationForm.types.ts` | Modify | Add callbackUrl prop |
| `src/features/auth/components/OtpVerificationForm/OtpVerificationForm.tsx` | Modify | Destructure and pass callbackUrl to hook |
| `src/features/auth/components/OtpVerificationForm/useOtpVerificationForm.ts` | Modify | Accept callbackUrl, build redirect with it on success |
| `docs/cursor-specs/`, `docs/daily-ship/` | Delete | Removed stale folders |

## Decisions

- **Query params over cookies/session** — Explicit, stateless, already the pattern used elsewhere in the app
- **No auto-sign-in after verification** — User still needs to sign in manually; callbackUrl is preserved through the login page which already handles the redirect (lines 225-233 in page.tsx)
- **Fallback preserved** — No callbackUrl → current behavior (redirect to `/`)

## Flow After Fix

```
Career Kit → /?callbackUrl=/oauth/authorize?...
  → Signup → /verify?email=...&callbackUrl=/oauth/authorize?...
  → OTP verified → /verify/success?callbackUrl=/oauth/authorize?...
  → "Sign in" → /?callbackUrl=/oauth/authorize?...
  → Sign in → window.location.href = /oauth/authorize?...
  → OAuth flow completes → back to Career Kit
```

## Validation

```bash
pnpm tsc --noEmit
pnpm build
pnpm test
```
