# PR-1.5.0 — Federated Sign-Out (RP-Initiated Logout)
**Branch:** `feature/b1-federated-signout` → `main`
**Version:** `1.5.0`
**Date:** 2026-02-28
**Status:** ✅ Ready to merge

---

## Summary

Implements OIDC RP-Initiated Logout so third-party clients can end the m2-auth session, not just their local app session. This closes the auto-approval gap after client sign-out and exposes logout capability in OIDC discovery metadata.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/app/oauth/logout/route.ts` | Created | New logout endpoint (`GET /oauth/logout`) |
| `src/features/auth/server/oauth/jwt.ts` | Modified | Added `decodeIdToken()` and `IdTokenPayload` |
| `src/app/.well-known/openid-configuration/route.ts` | Modified | Added `end_session_endpoint` |
| `docs/build-packet-reports/BUILD-federated-signout-report.md` | Created | Build packet completion report |
| `docs/journal/ENTRY-15.md` | Created | Feature journal entry |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Decode ID token hints without exp rejection | OIDC allows expired `id_token_hint` for logout context |
| Validate post-logout redirect URI against client allowlist | Prevents open redirects and enforces client ownership |
| Clear both secure/non-secure cookie variants | Ensures logout works in production and local development |
| Fallback redirect to `/` when no post-logout URI | Predictable UX and minimal implementation overhead |

## Testing Checklist

- [x] `GET /oauth/logout?id_token_hint=<valid>&post_logout_redirect_uri=<registered>` clears session and redirects
- [x] `GET /oauth/logout?id_token_hint=<valid>&post_logout_redirect_uri=<registered>&state=abc` appends `state`
- [x] `GET /oauth/logout?id_token_hint=<valid>` clears session and redirects to `/`
- [x] `GET /oauth/logout?post_logout_redirect_uri=<unregistered>` returns `400`
- [x] `GET /.well-known/openid-configuration` includes `end_session_endpoint`
- [ ] Automated route tests for logout endpoint (planned follow-up)

## Validation

Commands run:

```bash
pnpm tsc --noEmit
pnpm build
pnpm lint
```

Results:
- Typecheck: ✅
- Build: ✅
- Lint: ✅

## Deployment Notes

- No new environment variables required.
- No Prisma migration required.
- Consumer apps should update sign-out redirect to use `/oauth/logout` with `id_token_hint`.
