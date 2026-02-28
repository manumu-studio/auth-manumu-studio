# ENTRY-17 — Logout Cookie Clearing Hotfix (Federated Sign-Out)
**Date:** 2026-02-28
**Type:** Hotfix
**Branch:** `fix/logout-cookie-clearing`
**Version:** `1.6.1`

---

## What I Did

Patched `/oauth/logout` so session cookies are cleared on the actual redirect response object, preventing stale auth-server sessions after federated sign-out.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/app/oauth/logout/route.ts` | Modify | Replaced `cookieStore.delete()` approach with response cookie expiry before return |
| `docs/pull-requests/PR-1.6.1.md` | Create | PR release documentation |

## Decisions

- Cleared cookies via `response.cookies.set(..., { expires: new Date(0) })` to guarantee deletions are emitted with `NextResponse.redirect()`.
- Preserved secure/non-secure cookie handling by setting `secure` dynamically for `__Secure-` names.
- Kept logout validation behavior unchanged (`id_token_hint`, `client_id`, `post_logout_redirect_uri`, `state`).

## Still Open

- Run production E2E verification from LSA:
  - sign in → sign out → confirm auth cookies removed for `auth.manumustudio.com`
  - sign in again → ensure credentials prompt appears (no auto-approve)
- Deploy and validate LSA-side UX follow-up changes after this auth hotfix is confirmed.

## Validation

```bash
pnpm tsc --noEmit
```

Typecheck passed.
