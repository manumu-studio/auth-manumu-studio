# ENTRY-20 — Auto-Login After Email Verification

**Date:** 2025-03-05
**Type:** Feature
**Branch:** `feat/auto-login-after-verify`
**Version:** `1.7.0`

---

## What I Did

After OTP email verification, users are now automatically logged in. No manual sign-in step. The verify API creates a NextAuth JWT session and sets the session cookie; the client redirects directly to the destination (OAuth callback or dashboard).

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/features/auth/server/createSessionToken.ts` | Created | Encodes NextAuth JWT, exports cookie name helper |
| `src/app/api/auth/verify/route.ts` | Modified | Fetches user, creates session, sets cookie on success |
| `src/features/auth/components/OtpVerificationForm/useOtpVerificationForm.ts` | Modified | Redirects to callbackUrl or /dashboard via window.location.href |

## Decisions (rationale bullets)

- **JWT via `encode` from next-auth/jwt** — Matches NextAuth’s structure; no manual signing
- **Token payload** — Mirrors jwt callback: sub, uid, email, name, role
- **Full-page redirect** — `window.location.href` ensures the new cookie is sent on the next request; `router.push` would not
- **Cookie name per env** — `__Secure-` prefix in production for HTTPS-only

## Still Open (known gaps)

- `/verify/success` remains as fallback for direct access; no changes needed

## Validation (commands + results)

```
pnpm tsc --noEmit   # 0 errors
pnpm build          # Success
pnpm lint           # No violations
```
