# PR-0.7.0 — Rate Limiting (Critical Security)

**Date:** January 20, 2026  
**Branch:** `feature/rate-limiting-auth`  
**Type:** Security Hardening

---

## Summary

Adds rate limiting to critical authentication paths to prevent abuse and brute force attacks. Introduces a shared limiter utility with Upstash Redis support and a local in‑memory fallback.

---

## Scope

- `/api/auth/verify/resend`
- Credentials sign‑in (NextAuth authorize)
- Sign‑up server action

---

## Changes

- Added `src/lib/rateLimit.ts` shared limiter
- Added env validation for Upstash + rate limit settings
- Applied rate limiting to resend, sign‑in, sign‑up
- Added UI error messaging for rate limit responses
- Updated `docs/SECURITY.md`
- Added dependencies `@upstash/ratelimit` and `@upstash/redis`

---

## Testing

- Lint: **Done**
- Manual: pending (requires local env + Upstash for full validation)

---

## Notes

- Limits are based on IP + email when available
- 429 responses use generic errors to prevent enumeration

