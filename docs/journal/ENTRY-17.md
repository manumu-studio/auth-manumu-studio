# ENTRY-17 — Logout Cookie Clearing Hotfix (Federated Sign-Out)

**Date:** 2026-03-03
**Type:** Hotfix
**Branch:** `fix/logout-cookie-clearing-v2`
**Version:** `1.8.1`
**PR:** `docs/pull-requests/PR-fix-logout-cookie-clearing.md`

---

## What I Did

Patched `/oauth/logout` so session cookies are cleared on the actual redirect response object, preventing stale auth-server sessions after federated sign-out from Career Kit and LSA.

## Root Cause

`cookieStore.delete()` mutations (from `next/headers`) were not carried over to the final `NextResponse.redirect()` response. Auth cookies survived logout, and the next sign-in silently auto-approved due to active auth-server session.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/app/oauth/logout/route.ts` | Modify | Replaced `cookies().delete()` with response-bound cookie expiry on redirect |
| `docs/pull-requests/PR-fix-logout-cookie-clearing.md` | Update | PR documentation |

## Decisions

- Cleared cookies via `response.cookies.set(..., { expires: new Date(0) })` to guarantee deletions are emitted with `NextResponse.redirect()`.
- Preserved secure/non-secure cookie handling by setting `secure` dynamically for `__Secure-` names.
- Kept logout validation behavior unchanged (`id_token_hint`, `client_id`, `post_logout_redirect_uri`, `state`).
- Rebased onto v1.8.0 main via cherry-pick to avoid carrying duplicate OTP/onboarding commits from the original branch.

## Still Open

- Run E2E verification from both Career Kit and LSA:
  - sign in → sign out → confirm auth cookies removed for `auth.manumustudio.com`
  - sign in again → ensure credentials prompt appears (no auto-approve)
- Add production `redirectUris` for Career Kit (`https://careerkit.manumustudio.com`) when frontend deploys.

## Validation

```bash
pnpm tsc --noEmit
```

Typecheck passed.
