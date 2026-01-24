# PR-1.3.0 — JWKS + OIDC Discovery

**Date:** January 24, 2026  
**Branch:** `feature/jwks-and-oidc-discovery`  
**Type:** Auth Server Foundations (Phase 1)

---

## Summary

Publishes **JWKS** and **OIDC discovery** metadata for third-party token verification and moves OAuth access tokens to **RS256** signing with a dedicated RSA keypair.

---

## Scope

- `/jwks.json` endpoint with public verification keys
- `/.well-known/openid-configuration` discovery metadata
- RS256 signing for OAuth access tokens
- Documentation updates for verification + env configuration
- Tests covering JWKS/OIDC happy path and failure modes

---

## Changes

- Added RSA signing utilities and issuer helpers for the OAuth token flow
- Exposed JWKS and OIDC discovery endpoints with cache headers
- Updated token exchange to issue RS256 access tokens
- Added JWKS + discovery tests (verification + negative cases)
- Updated SECURITY, ARCHITECTURE, README, and DEVELOPMENT_JOURNAL
- Added journal entry for this feature

---

## Testing

- `pnpm lint`: **not run**
- `pnpm typecheck`: **not run**
- `pnpm test`: **not run**
- `pnpm build`: **not run**

---

## Database / Migrations

- None

---

## Test Permanence Decision

| test_file | status (PERMANENT / MOVE / DELETE) | rationale | risks if wrong | required follow-up |
|---|---|---|---|---|
| `tests/jwks-oidc-discovery.test.ts` | **PERMANENT** | Validates JWKS + discovery integrity and token verification. | Tokens cannot be verified, break third-party integrations | Keep in default CI test suite |
| `tests/oauth-token-endpoint.test.ts` | **PERMANENT** | Validates token exchange invariants with RS256 signing. | OAuth tokens regress silently | Keep in default CI test suite |

---

## Evidence

Commands run:
- _Not run (pending)_

Test files added/changed:
- `tests/jwks-oidc-discovery.test.ts`
- `tests/oauth-token-endpoint.test.ts`

---

## Known Follow-Ups (Not Blocking)

- Run lint/typecheck/test/build + Husky + RepoAuditAgent gates
- Document JWKS key rotation workflow

---

## Merge Status

**⚠️** Pending quality gates
