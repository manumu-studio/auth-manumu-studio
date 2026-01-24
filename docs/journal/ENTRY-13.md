# Entry 13 — JWKS + OIDC Discovery

**Date:** January 24, 2026  
**Type:** Auth Server Foundations  
**Branch:** `feature/jwks-and-oidc-discovery`

---

## Summary

Published **JWKS** and **OIDC discovery** metadata so third-party services can verify OAuth access tokens without sharing secrets. OAuth access token signing was migrated to **RS256** using a dedicated RSA keypair.

This completes the third-party verification surface required for production OAuth integrations.

---

## Key Changes

### 1. JWKS Endpoint
- Added `GET /jwks.json` to publish public verification keys
- Includes `kid`, `alg`, and `use` metadata for RS256 verification
- Response cached to support efficient third-party validation

### 2. OIDC Discovery
- Added `GET /.well-known/openid-configuration`
- Exposes issuer, authorization endpoint, token endpoint, and `jwks_uri`
- Declares supported scopes, response types, and PKCE methods

### 3. Token Signing
- OAuth access tokens are now signed with **RS256**
- Signing uses `OAUTH_JWT_PRIVATE_KEY`
- Public verification key is exposed via JWKS (`OAUTH_JWT_PUBLIC_KEY`)
- Removes the need for shared secrets across services

### 4. Tests
- Validates JWKS payload integrity
- Verifies that a signed access token can be validated using published JWKS
- Covers failure modes:
  - missing public key
  - invalid public key
- Confirms OIDC discovery metadata contains issuer and required endpoints

### 5. Documentation
- Updated:
  - `SECURITY.md`
  - `ARCHITECTURE.md`
  - `README.md`
  - `DEVELOPMENT_JOURNAL.md`
- Added PR documentation for this feature

---

## Files Touched

- `src/app/jwks.json/route.ts`
- `src/app/.well-known/openid-configuration/route.ts`
- `src/features/auth/server/oauth/jwt.ts`
- `src/features/auth/server/oauth/issuer.ts`
- `src/features/auth/server/oauth/token.ts`
- `src/lib/env.ts`
- `tests/jwks-oidc-discovery.test.ts`
- `tests/oauth-token-endpoint.test.ts`
- `docs/SECURITY.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_JOURNAL.md`
- `docs/pull-requests/PR-1.3.0.md`
- `README.md`

---

## Validation

- Lint: **Pass**
- Typecheck: **Pass**
- Tests: **Pass** (JWKS + OAuth token tests)
- Build: **Pass**
- Husky: **Pass**
- RepoAuditAgent: **Pass**