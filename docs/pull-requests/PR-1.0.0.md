# PR-1.0.0 — OAuth Client Registry + Account Origin Split

**Date:** January 20, 2026  
**Branch:** `feature/oauth-client-registry`  
**Type:** Auth Server Foundations

---

## Summary

Adds a first-party OAuth client registry with strict redirect/origin allowlists, introduces account-origin separation between ManuMu and Petsgram users, and enforces a root redirect for unknown routes.

---

## Scope

- OAuth client registration with secure secret handling
- Account origin separation (FIRST_PARTY vs PETSGRAM)
- 404 redirect to `/`
- Petsgram local integration via seed

---

## Changes

- Added `OAuthClient` model + migrations
- Added registry utilities (create/rotate/validate)
- Added `origin` to `users` and guarded credential sign-in
- Seeded Petsgram client for local integration
- Documented client registration and account separation
- Added `not-found` redirect

---

## Testing

- Lint: **✔**
- Typecheck: **✔**
