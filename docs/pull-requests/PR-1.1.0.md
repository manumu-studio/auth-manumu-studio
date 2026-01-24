# PR-1.1.0 — OAuth Authorization Endpoint (Consent + PKCE)

**Date:** January 24, 2026  
**Branch:** `feature/oauth-authorization-endpoint`  
**Type:** Auth Server Foundations (Phase 1)

---

## Summary

Implements `/oauth/authorize` for third-party OAuth2 Authorization Code flow, including consent UI, strict client + redirect validation, PKCE support, and short-lived authorization code persistence.

This completes the **authorization endpoint** portion of Phase 1 and unblocks token + JWKS work.

---

## Scope

- `/oauth/authorize` entry point (authorization code flow)
- Client registry validation (`client_id`, redirect URI allowlists)
- Scope validation (`openid`, `email`, `profile`)
- PKCE challenge + method handling
- Authorization code persistence with expiry and one-time use
- Coverage for happy path and security-critical failures

---

## Changes

- Added `OAuthAuthorizationCode` Prisma model + migration
- Added authorization code creation and expiry helpers
- Added authorize request validation utilities
- Implemented `/oauth/authorize` page with consent UI + redirects
- Added tests for validation, PKCE guards, and code storage
- Updated SECURITY, ARCHITECTURE, README, and DEVELOPMENT_JOURNAL
- Added journal entry for this feature

---

## Testing

- `pnpm lint`: pass  
- `pnpm typecheck`: pass  
- `pnpm test`: pass (27 tests)  
- `pnpm build`: pass  
  - ⚠️ Known warning: Next.js ESLint plugin not detected (tracked, non-blocking)

---

## Database / Migrations

- Local: `pnpm exec prisma migrate dev`
  - Applied migration for `OAuthAuthorizationCode`
- Production: `pnpm exec prisma migrate deploy` (required on deploy)

---

## Test Permanence Decision

| test_file | status (PERMANENT / MOVE / DELETE) | rationale | risks if wrong | required follow-up |
|---|---|---|---|---|
| `tests/oauth-authorization-endpoint.test.ts` | **PERMANENT** | Validates OAuth authorization invariants (redirect allowlists, PKCE, code TTL) required by Phase 1. | OAuth regressions, security bypass, broken third-party auth clients | Keep this in default CI test suite |

---

## Evidence

Commands run:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Test files added/changed:
- `tests/oauth-authorization-endpoint.test.ts`

---

## Known Follow-Ups (Not Blocking)

- Implement `/oauth/token` endpoint
- Add JWKS + OIDC discovery (`/.well-known/openid-configuration`)
- Manual CSP validation for OAuth redirects
- Optional: enable Next.js ESLint plugin

---

## Merge Status

**✓** Ready to merge