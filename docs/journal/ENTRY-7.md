# Entry 7 — Rate Limiting (Critical Security)

**Date:** January 20, 2026  
**Type:** Security Hardening  
**Branch:** `feature/rate-limiting-auth`

---

## Summary

Implemented rate limiting across the most sensitive authentication paths to prevent brute force and abuse. Added a shared limiter utility with Upstash support and an in‑memory fallback for local development. Updated security documentation and error handling to preserve generic responses.

---

## Key Changes

1. **Shared Rate Limiter Utility**
   - Added `src/lib/rateLimit.ts`
   - Supports Upstash Redis when available
   - Falls back to in‑memory sliding window for local runs

2. **Endpoint Protections**
   - `/api/auth/verify/resend` is rate limited
   - Credentials sign‑in (NextAuth authorize) is rate limited
   - Sign‑up server action is rate limited

3. **Error Handling**
   - Returns 429 responses with generic messages
   - UI shows a friendly “Too many requests” message

4. **Configuration Updates**
   - Added env validation for Upstash + rate limit settings
   - Updated `docs/SECURITY.md`

---

## Files Touched

- `src/lib/rateLimit.ts`
- `src/app/api/auth/verify/resend/route.ts`
- `src/features/auth/server/options.ts`
- `src/features/auth/server/actions/signup.ts`
- `src/app/(public)/page.tsx`
- `src/lib/env.ts`
- `docs/SECURITY.md`
- `package.json`

---

## Validation

- Lint: **Done** No errors
- Manual testing: pending (requires local env + Upstash for full validation)

