# PR-1.6.1 — Federated Sign-Out Cookie Clearing Hotfix
**Branch:** `fix/logout-cookie-clearing` → `main`
**Version:** `1.6.1`
**Date:** 2026-02-28
**Status:** ✅ Ready to merge

---

## Summary

Fixes a federated sign-out regression where auth-session cookies were not cleared when returning `NextResponse.redirect()` from `/oauth/logout`. Cookie deletions now happen on the redirect response object via `response.cookies.set(..., { expires: new Date(0) })`, ensuring logout state is actually persisted to the browser.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/app/oauth/logout/route.ts` | Modified | Replaced `cookies().delete()` pattern with response-bound cookie expiry on redirect |

## Root Cause

- `cookieStore.delete()` mutations (from `next/headers`) were not carried over to the final `NextResponse.redirect()` response.
- Result: auth cookies survived logout, and the next sign-in silently auto-approved due to active auth-server session.

## Fix Details

- Introduced cookie name list and centralized clearing helper:
  - `next-auth.session-token`
  - `__Secure-next-auth.session-token`
  - `next-auth.csrf-token`
  - `__Secure-next-auth.csrf-token`
  - `next-auth.callback-url`
  - `__Secure-next-auth.callback-url`
- Built redirect URL first, then:
  - `const response = NextResponse.redirect(redirectTarget)`
  - clear cookies on `response.cookies.set(...)` with `expires: new Date(0)`
  - return `response`

## Test Plan

- [x] Logout route compiles with updated cookie-clearing path
- [x] `pnpm tsc --noEmit` passes
- [ ] E2E: LSA sign in → sign out → verify auth cookies removed for `auth.manumustudio.com`
- [ ] E2E: Re-sign-in requires credentials (no silent auto-approval)

## Validation

Commands run:

```bash
pnpm tsc --noEmit
```

Results:
- Typecheck: ✅

## Deployment Notes

- No migration required.
- No new environment variables required.
- Must be deployed before validating LSA-side federated sign-out polish changes.
