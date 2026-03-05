# PR — Fix OAuth Signup Redirect

**Journal:** ENTRY-21
**Branch:** `fix/oauth-signup-redirect` → `main`
**Version:** `1.8.3`
**Date:** 2025-03-05
**Status:** Ready to merge

---

## Summary

Users who sign up via OAuth from external apps (LSA, Careerkit) were redirected to the auth server dashboard instead of back to the originating app. This fix ensures `callbackUrl` survives the full signup → verify → success → sign-in chain.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/features/auth/components/OtpVerificationForm/useOtpVerificationForm.ts` | Modified | Redirect to `/verify/success?callbackUrl=...` instead of direct redirect |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Redirect via success page | Keeps full OAuth chain intact; sign-in page already handles authenticated redirect to callbackUrl |
| URLSearchParams for callbackUrl | Nested query params require proper encoding; avoids double-encoding |

## Testing Checklist

- [ ] OAuth flow: external app → sign up → verify → success → sign in → redirected back to external app
- [ ] Direct signup (no callbackUrl) → verify → success → `/` as before
- [ ] `callbackUrl` survives full chain without corruption
- [x] `pnpm tsc --noEmit` — zero errors
- [x] `pnpm build` — clean build
- [x] `pnpm run lint` — no violations

## Deployment Notes

- No migration required
- No new environment variables
- No breaking changes
