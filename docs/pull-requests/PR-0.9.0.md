# PR-0.9.0 — Auth Critical Flow Tests

**Date:** January 20, 2026  
**Branch:** `test/auth-critical-flows`  
**Type:** Testing + Quality

---

## Summary

Adds unit and integration tests for the most sensitive authentication flows, covering password hashing, verification tokens, resend behavior, and rate limit enforcement.

---

## Scope

- Password hashing verification
- Token generation + validation
- Email verification resend + consume flows
- Rate limit responses for signup, resend, and credentials sign-in

---

## Changes

- Added critical auth flow tests in `tests/auth-critical-flows.*.test.ts`
- Added coverage for rate limit guardrails
- Updated development journal documentation

---

## Testing

- Lint: **Done**
- Typecheck: **Done**
- Tests: **Done** `pnpm test`
