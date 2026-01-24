# PR-1.2.0 — OAuth Token Endpoint (JWT Exchange)

**Date:** January 24, 2026  
**Branch:** `feature/oauth-token-endpoint`  
**Type:** Auth Server Foundations (Phase 1)

---

## Summary

Implements `/oauth/token` for OAuth2 authorization code exchange, issuing **JWT access tokens** with PKCE verification (when applicable) and client authentication for both **public** and **confidential** clients.

This completes the **token endpoint** portion of Phase 1 and unblocks JWKS + OIDC discovery work.

---

## Scope

- `/oauth/token` route supporting `application/x-www-form-urlencoded` (and JSON payloads for developer convenience)
- Authorization code validation:
  - client match
  - redirect_uri match
  - TTL enforcement
  - one-time use (replay prevention)
- Client authentication:
  - HTTP Basic auth, or
  - `client_secret` in body (confidential clients)
- PKCE `code_verifier` validation **when a code challenge was stored**
- JWT access token issuance signed with `NEXTAUTH_SECRET`
- Coverage for happy path + security-critical failure modes

---

## Changes

- Added token exchange helper with:
  - client secret validation (confidential clients)
  - PKCE verification (when `code_challenge` exists)
  - authorization code TTL + one-time use enforcement
- Implemented `/oauth/token` API route with Basic auth parsing and OAuth-style error responses
- Issued JWT access tokens with standard claims used by our ecosystem (`iss`, `aud`, `sub`, `exp`, `scope`)
- Added integration tests for token exchange and invalid cases
- Updated SECURITY, ARCHITECTURE, README, and DEVELOPMENT_JOURNAL
- Added journal entry for this feature

---

## Testing

- `pnpm lint`: pass  
- `pnpm typecheck`: pass  
- `pnpm test`: pass (**31 tests**)  
- `pnpm build`: pass  
  - ⚠️ Known warning: Next.js ESLint plugin not detected (tracked, non-blocking)

---

## Database / Migrations

- None

---

## Test Permanence Decision

| test_file | status (PERMANENT / MOVE / DELETE) | rationale | risks if wrong | required follow-up |
|---|---|---|---|---|
| `tests/oauth-token-endpoint.test.ts` | **PERMANENT** | Validates token exchange invariants (PKCE, client auth, code TTL, one-time use). | Token leaks, replay, broken OAuth integrations | Keep in default CI test suite |

---

## Evidence

Commands run:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `./.husky/pre-commit`
- `./tools/agents/RepoAuditAgent/run.sh`

Test files added/changed:
- `tests/oauth-token-endpoint.test.ts`

---

## Known Follow-Ups (Not Blocking)

- Add refresh token support (rotation + storage)
- Publish JWKS + OIDC discovery endpoints
- Confirm OAuth client classification (public vs confidential) in registry UI

---

## Merge Status

**✓** Ready to merge