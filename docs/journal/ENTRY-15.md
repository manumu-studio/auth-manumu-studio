# ENTRY-15 — Federated Sign-Out (RP-Initiated Logout)
**Date:** 2026-02-28
**Type:** Feature
**Branch:** `feature/b1-federated-signout`
**Version:** `1.5.0`

---

## What I Did

Implemented OIDC RP-Initiated Logout so external clients can terminate the auth-server session and avoid silent auto-approval on the next authorization attempt.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/app/oauth/logout/route.ts` | Create | Added `GET /oauth/logout` endpoint for federated sign-out |
| `src/features/auth/server/oauth/jwt.ts` | Modify | Added `IdTokenPayload` and `decodeIdToken()` (signature verification, no exp rejection) |
| `src/app/.well-known/openid-configuration/route.ts` | Modify | Added `end_session_endpoint` |
| `docs/build-packet-reports/BUILD-federated-signout-report.md` | Create | Build packet execution report |

## Decisions

- Used `id_token_hint` as the primary client-resolution source via `aud`.
- Allowed expired `id_token_hint` values if signature is valid (OIDC-compliant behavior).
- Enforced strict `post_logout_redirect_uri` allowlist validation from `OAuthClient.redirectUris`.
- Cleared both secure and non-secure NextAuth cookie variants to support dev/prod consistency.
- Defaulted no-redirect logout to `/` for a simple and stable fallback.

## Still Open

- Add dedicated route/service tests for logout happy path and invalid redirect/id token cases.
- Update consuming client apps (e.g., LSA) to pass `id_token_hint` and `post_logout_redirect_uri` to `/oauth/logout`.

## Validation

```bash
pnpm tsc --noEmit
pnpm build
pnpm lint
```

All commands passed successfully.
