# Entry 12 — OAuth Token Endpoint (JWT Exchange)

**Date:** January 24, 2026  
**Type:** Auth Server Foundations  
**Branch:** `feature/oauth-token-endpoint`

---

## Summary

Implemented `/oauth/token` to exchange authorization codes for JWT access tokens, including PKCE verification **when a code challenge exists** and client authentication for confidential clients.

---

## Key Changes

1. **Token Endpoint**
   - Added `/oauth/token` route supporting `application/x-www-form-urlencoded` (and JSON payloads for developer convenience)
   - Parses Basic auth and validates client credentials
   - Returns OAuth-style error responses (`error`, `error_description`)
   - Returns JWT access tokens with standard claims used by our ecosystem

2. **Token Exchange Logic**
   - Validates authorization codes:
     - client match
     - redirect_uri match
     - TTL enforcement
     - one-time use (replay prevention)
   - Enforces PKCE `code_verifier` when a challenge was stored
   - Marks codes as used **before** issuing tokens (prevents replay)

3. **Tests**
   - Happy-path exchange for confidential clients
   - Invalid client secret rejection
   - PKCE verifier mismatch rejection
   - Used/expired code rejection

4. **Documentation**
   - Added token endpoint details to SECURITY + ARCHITECTURE
   - Updated README feature list and development journal

---

## Files Touched

- `src/app/oauth/token/route.ts`
- `src/features/auth/server/oauth/token.ts`
- `src/features/auth/server/oauth/index.ts`
- `tests/oauth-token-endpoint.test.ts`
- `docs/SECURITY.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_JOURNAL.md`
- `docs/pull-requests/PR-1.2.0.md`
- `README.md`

---

## Validation

- Lint: **Done** No errors
- Typecheck: **Done** No errors
- Tests: **Done** 31 passed
- Build: **Done** Next.js build succeeded (ESLint plugin warning only)
- Husky: **Done** pre-commit checks passed
- RepoAuditAgent: **Done** report generated