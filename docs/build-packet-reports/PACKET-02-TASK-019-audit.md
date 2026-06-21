# PACKET-02 / TASK-019 Audit Report — Atomic Credentials Registration

**Date:** 2026-06-21
**Branch:** `feat/task-022-social-jit` (TASK-019 = uncommitted working tree, base `452e4283`)
**Auditor:** Claude Code (Fable) + 3 parallel subagents (quality gates · spec/security · scanners)
**Verdict:** 🔴 **BLOCKED** — implementation logic is solid, but **5 spec-mandated adversarial tests are missing**.

## Quality Gates

| Gate | Status | Details |
|------|--------|---------|
| `prisma:validate` | ✅ | Schema valid |
| `typecheck` (`tsc --noEmit`) | ✅ | 0 errors |
| `lint` | ✅ | Clean |
| `test` (vitest) | ✅ | 213 passed, 0 failed, 0 skipped (19 files) |
| `build` (`next build`) | 🔴 env | Fails on `ADMIN_MFA_SECRET_KEY_VERSION is required in production` — **environmental** (no prod env in local build), NOT a TASK-019 code defect. Same pattern as prior sessions. Re-verify with production-placeholder env. |

## Spec Compliance (security crux) — logic PASS, tests BLOCKED

Implementation logic satisfies all 10 requirements; no type-safety violations (`any`/`as`/`!` all clean).

- ✅ Credential-free `/register` POST — `passwordHash` NULL until verify
- ✅ Atomic tx: ref consume-CAS (`sha256(handle)`) + `redeemInviteInTx` (3-arg, server-resolved invite) + INACTIVE user + outbox share one `tx`; `registerWithInvite` owns the consume-CAS (not `redeemInviteInTx`)
- ✅ Verify: OTP-only binding → `passwordHash` + `emailVerified` + `ACTIVE` in one step; no handle/cookie re-check
- ✅ Auto-login only after `ACTIVE`
- ✅ Non-`ACTIVE` rejected at all 6 boundaries (credentials authorize, JWT/session, post-verify mint, OAuth authz, token claims, UserInfo)
- ✅ Enumeration parity + `P2002` caught in-service
- ✅ Login limiter per-IP + per-account; CSRF before redemption; contract boundary respected (no rawToken, no re-impl)

## 🔴 Blockers — 5 missing spec-mandated tests (`tests/gated-registration-credentials.test.ts`)

The spec's **Tests** section explicitly requires all five. For CRITICAL auth, these are the tests that *prove* the security properties — their absence is the block, not a logic defect.

- **B1 — Opaque-ref isolation:** no test that a cookie ref minted for invite A cannot redeem invite B.
- **B2 — Consume-CAS single-use replay:** no test that a 2nd POST with a CONSUMED handle yields `count === 0` → generic failure → no second user; and that consume is NOT keyed on `id`.
- **B3 — CSRF rejection:** `registerWithInvite` is never tested to reject before ref resolution when CSRF fails.
- **B4 — Non-`ACTIVE` denial:** only credentials `authorize` is tested; JWT/session refresh, OAuth authorization, token claims, and UserInfo denial are untested.
- **B5 — Version-0 session compatibility + post-increment invalidation:** required by spec, not found in the suite.

## ⚠️ Warnings

- **W1 — tx write order:** `user.create` runs *before* `redeemInviteInTx` (departs the spec's narrative order). Functionally OK under Read Committed, but confirm intent.
- **W2 — verify-step atomicity (the one real logic concern):** the OTP lookup (`findFirst` + expiry + status) runs **outside** the tx — no compare-and-set inside the tx on `VerificationToken`. A concurrent verifier race is possible *unless* TASK-018 guarantees single-OTP-per-email. Tighten the CAS or confirm the invariant.
- **W3 — dead parity code:** in `authorize`, `createGenericAdmissionFailure`'s body is discarded; parity holds via NextAuth's uniform `null`, not the helper. Clean up.
- **W4 — file headers:** missing one-line header on `oauth/authorization.ts` and `oauth/authorize/page.tsx`.
- **W5 — unused exports (knip):** `REGISTRATION_CSRF_COOKIE_NAME` / `REGISTRATION_SESSION_COOKIE_NAME` re-exported from the barrel but unused outside the module.

## Notes

- `registerWithInvite.ts` = 298 lines (2 under the 300 limit) — split if it grows.
- `oauth/authorize/page.tsx` (243), `options.ts` (234) — above the 250 advisory.
- semgrep + gitleaks not installed (scanners skipped); madge clean (no cycles).

## Summary

- **Blockers:** 5 (all missing tests) · **Warnings:** 5 · **Notes:** 4
- Implementation logic: **PASS** · Type safety: **clean** · Gates: **4/5** (build env-blocked)
- **Not shippable until B1–B5 are written and the W2 concurrency question is resolved.**

---

## Re-Audit (Round 2) — 2026-06-21

GPT-5.5 second pass. Test count 213 → 219 (working tree). Re-verified that the new tests exercise the attacks, not just decorate.

| Item | Verdict | Evidence |
|------|---------|----------|
| B1 opaque-ref isolation | ✅ RESOLVED | `gated-registration-credentials.test.ts:270` — asserts `$transaction`/`user.create`/`redeemInviteInTx` not called, 403 opaque body |
| B2 consumed-handle replay | ✅ RESOLVED | `:298` — `count=0` → fail, `user.create ×1`, `where` has no `id` |
| B3 CSRF before redemption | ✅ RESOLVED | `:340` — `registrationSession.findUnique` never called, no `$transaction` |
| B4 non-ACTIVE at 4 boundaries | ⚠️ WEAK | `:562` — JWT/session, OAuth authz, UserInfo solid; **token-claims gate conflated with token issuance** — no test that an already-issued token for a now-INACTIVE `sub` is rejected at the claims layer. Guard exists (`token.ts:136`); test isolation missing |
| B5 v0 session compat + invalidation | ✅ RESOLVED | `:703` — v0 accepted, v1 increment → `authRejected: true`, `uid` undefined |
| W2 verify-step atomicity | ✅ RESOLVED | `consumeToken.ts:15–61` — `$transaction` wraps `findFirst` + `updateMany` CAS + `deleteMany`; loser can't overwrite `passwordHash` |

**New finding (W6):** `bcrypt.hash(password, 10)` runs **inside** the `$transaction` (`consumeToken.ts:35`) — holds a DB connection ~100ms/verify. Correctness fine; latency/pool concern. Move the hash outside the tx, pass the precomputed hash into the activation CAS.

**Round-2 verdict:** 4/5 blockers genuinely resolved with real assertions; W2 fixed. Remaining: **B4 token-claims test isolation** + **W6 bcrypt-outside-tx**. Tests run clean (22/22 in the two files, no `.skip`/`.only`). All TASK-019 work remains **uncommitted** (expected — user commits after audit) — commit once B4 closes so it can't be lost.

---

## Re-Audit (Round 3 / Final) — 2026-06-21

GPT-5.5 third pass closed the last two items. Verified, not trusted.

| Item | Verdict | Evidence |
|------|---------|----------|
| B4 token-claims isolation | ✅ RESOLVED | `gated-registration-credentials.test.ts:705` — `getUserClaims("user-now-inactive")` → `toBeNull()`; lookup `select.status: true`; real guard `claims.ts:29` (`status !== "ACTIVE" → null`) |
| W6 bcrypt outside tx | ✅ RESOLVED | `consumeToken.ts:14` `hash()` runs **before** `$transaction` (line 16); precomputed hash passed in at :39; W2 CAS atomicity intact (OTP findFirst + activation updateMany guard + consume deleteMany, each count===1) |

Focused suite 17/17, full suite 220/220, typecheck clean, no `.skip`/`.only`.

### ✅ FINAL VERDICT: PASS

All 5 blockers (B1–B5) closed with real, attack-exercising tests; W2 + W6 resolved. Residual minor warnings (non-blocking, optional polish): **W1** confirm tx write-order intent, **W3** dead parity code in `authorize`, **W4** missing file-header comments on `oauth/authorization.ts` + `authorize/page.tsx`, **W5** unused barrel exports. None gate the merge. **TASK-019 is ready to commit.**
