# Phase 0: Critical Security (Must Ship First)

This phase blocks any third‑party auth work. Ship in the order below.

---

## 1) `feature/rate-limiting-auth`

**Goal:** Prevent brute force and abuse on auth endpoints.

**Scope:**
- `/api/auth/verify/resend`
- Sign‑in attempts (NextAuth credentials)
- Sign‑up server action

**Tasks:**
- Add shared rate‑limit utility (Upstash or equivalent)
- Identify requester by IP + email when possible
- Return 429 with generic error message
- Add cooldown logic for resend (if not already enforced)

**Acceptance Criteria:**
- Requests above limit return 429 consistently
- No user enumeration in error messages
- Limits documented in `docs/SECURITY.md`

**Notes:**
- Prefer sliding window limits (e.g., 3 per hour)
- Apply same identifiers in test cases

---

## 2) `feature/security-headers`

**Goal:** Baseline HTTP security protections.

**Status:** **✔** Complete
**Scope (minimum):**
- Content‑Security‑Policy (CSP)
- HSTS
- X‑Frame‑Options
- Referrer‑Policy

**Tasks:**
- Implement headers in middleware or Next.js config
- Ensure CSP supports NextAuth + OAuth redirects
- Document header policy in `docs/SECURITY.md`

**Acceptance Criteria:**
- Headers present on auth routes and public pages
- CSP does not break OAuth provider callbacks

---

## 3) `test/auth-critical-flows`

**Goal:** Add tests for the most sensitive auth paths.

**Scope:**
- Password hashing verification
- Token generation + validation
- Email verification flow

**Tasks:**
- Add unit tests for hashing and token utilities
- Add integration tests for verification resend + verify
- Add tests for rate‑limit behavior where feasible

**Acceptance Criteria:**
- Tests run in CI and pass
- Coverage expanded beyond validation‑only tests
