# Entry 10 — OAuth Client Registry + Account Origin Split

**Date:** January 20, 2026  
**Type:** Auth Server Foundations  
**Branch:** `feature/oauth-client-registry`

---

## Summary

Introduced an OAuth client registry for third-party apps with strict redirect/origin allowlists, plus a hard account-origin split between first-party ManuMu users and Petsgram users. Also added a 404 redirect to keep invalid routes anchored to `/`.

---

## Key Changes

1. **OAuth Client Registry**
   - New `OAuthClient` model with redirect URI + origin allowlists
   - Secure client secret hashing and rotation utilities
   - Seeded Petsgram client for local integration

2. **Account Origin Separation**
   - Added `origin` to users (`FIRST_PARTY` vs `PETSGRAM`)
   - Petsgram users blocked from ManuMu credentials sign-in
   - First-party signup always creates `FIRST_PARTY` users

3. **Route Safety**
   - Added App Router `not-found` redirect to `/`

---

## Files Touched

- `prisma/schema.prisma`
- `prisma/migrations/20260120211000_oauth_client_registry/`
- `prisma/migrations/20260120213000_user_origin/`
- `prisma/seed.ts`
- `src/features/auth/server/oauth/`
- `src/features/auth/server/actions/signup.ts`
- `src/features/auth/server/actions/signin.ts`
- `src/features/auth/server/options.ts`
- `src/app/not-found.tsx`
- `docs/SECURITY.md`
- `docs/DEVELOPMENT_JOURNAL.md`

---

## Validation

- Lint: **✔** No errors
- Typecheck: **✔** No errors
