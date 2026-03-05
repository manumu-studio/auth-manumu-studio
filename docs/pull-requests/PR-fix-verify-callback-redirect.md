# PR-1.8.2 — Fix Post-Verification Redirect to Originating App

**Journal:** ENTRY-19
**Branch:** `fix/verify-callback-redirect` → `main`
**Version:** `1.8.2`
**Date:** 2026-03-03
**Status:** Ready to merge

---

## Summary

After email verification (OTP), users were redirected to `auth.manumustudio.com/` instead of back to the app they came from. This fix threads `callbackUrl` through the signup → verify → success → login flow via query parameters.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/app/(public)/page.tsx` | Modified | Pass callbackUrl to /verify redirect |
| `src/app/(auth)/verify/page.tsx` | Modified | Forward callbackUrl to OtpVerificationForm |
| `src/app/(auth)/verify/success/page.tsx` | Modified | Include callbackUrl in "Sign in" link |
| `src/features/auth/components/OtpVerificationForm/OtpVerificationForm.types.ts` | Modified | Add callbackUrl prop |
| `src/features/auth/components/OtpVerificationForm/OtpVerificationForm.tsx` | Modified | Pass callbackUrl to hook |
| `src/features/auth/components/OtpVerificationForm/useOtpVerificationForm.ts` | Modified | Build redirect URL with callbackUrl |
| `docs/cursor-specs/`, `docs/daily-ship/` | Deleted | Stale folders cleanup |

## Test Plan

- [ ] Start OAuth flow from Career Kit → sign up → verify email → sign in → redirected back to Career Kit
- [ ] Direct signup (no callbackUrl) → verify → success → links to `/` as before
- [ ] callbackUrl survives the full chain without corruption or double-encoding
- [x] Typecheck passes
- [x] Build passes
- [x] Tests pass (36/36)

## Deployment Notes

- No migration required
- No new environment variables
- No breaking changes
