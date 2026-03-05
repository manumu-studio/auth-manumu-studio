# PR-1.7.0 — Auto-Login After Email Verification

**Branch:** `feat/auto-login-after-verify` → `main`
**Version:** `1.7.0`
**Date:** 2025-03-05
**Status:** ✅ Ready to merge

---

## Summary

After OTP email verification, users are automatically logged in. The verify API creates a NextAuth session and sets the session cookie; the client redirects directly to the destination (OAuth authorize page or dashboard). No manual sign-in required.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/features/auth/server/createSessionToken.ts` | Created | JWT encode + getSessionCookieName helper |
| `src/app/api/auth/verify/route.ts` | Modified | Create session and set cookie on OTP success |
| `src/features/auth/components/OtpVerificationForm/useOtpVerificationForm.ts` | Modified | Direct redirect to callbackUrl or /dashboard |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Use `encode` from next-auth/jwt | Matches NextAuth JWT structure; no manual signing |
| Full-page redirect (window.location.href) | Ensures browser sends new session cookie on next request |
| Cookie name per environment | `__Secure-` prefix in production for HTTPS-only |

## Testing Checklist

- [ ] OAuth flow: sign up → verify OTP → auto-redirect to client app (no manual sign-in)
- [ ] Direct signup: sign up → verify OTP → auto-redirect to /dashboard
- [ ] Session is active on destination page
- [ ] /verify/success still works when accessed directly
- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes

## Deployment Notes

- No migration required
- No new environment variables
- No breaking changes
