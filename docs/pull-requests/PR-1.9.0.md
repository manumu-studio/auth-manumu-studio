# PR-1.9.0 - Add Packet 02 Gated Registration Schema Foundation

**Journal:** `ENTRY-24`
**Branch:** `feat/gated-registration`
**Version:** `1.9.0`
**Date:** `2026-06-21`
**Status:** Draft validation complete locally

---

## Summary

This PR adds the Packet 02 foundation for invite-gated registration. It does not expose the user-facing invite flow yet. Instead, it prepares the durable state, email delivery worker, and shared admission controls later tasks need: account lifecycle status, invite lifecycle services, transactional outbox rows plus an internal worker with claim-token fencing and encrypted invite delivery, immutable audit rows, explicit account-link intents, opaque registration sessions, admin MFA factor state, Turnstile validation, generic admission parity, CSRF validation, fail-closed production env enforcement, and six-surface limiter wiring.

## Files Changed

| File or Area | Action | Notes |
|--------------|--------|-------|
| `package.json` | Modified | Version bumped to 1.9.0; security overrides retained |
| `pnpm-lock.yaml` | Modified | Lockfile reflects existing dependency override updates |
| `prisma/schema.prisma` | Modified | Packet 02 schema foundation |
| `prisma/migrations/20260620173500_gated_registration_foundation/` | Created | Forward migration and manual rollback `down.sql` |
| `tests/gated-registration-schema.test.ts` | Created | Schema/migration invariant coverage |
| `src/features/auth/server/invites/` | Created | Server-only invite lifecycle service foundation |
| `tests/gated-registration-invites.test.ts` | Created | Invite lifecycle invariant coverage |
| `src/features/auth/server/outbox/`, `src/app/api/internal/outbox-email/route.ts` | Created | Transactional email outbox worker, QStash-safe message/dedup helpers, claim/fencing state transitions, encrypted invite delivery, and worker route |
| `tests/gated-registration-outbox.test.ts` | Created | Outbox route, QStash, claim/fencing, retry, encryption, key-rotation, and fragment-link coverage |
| `src/features/auth/server/admission/`, `src/features/auth/lib/turnstile/` | Created | Shared admission/parity/CSRF helpers and Turnstile verifier |
| `src/lib/rateLimitAdmission.ts`, `src/lib/rateLimitIdentifiers.ts` | Created | Packet 02 limiter dimensions and hashed limiter identifiers |
| `src/lib/env.ts`, `.env.example`, `src/lib/rateLimit.ts` | Modified | Packet 02 production env contract and admission policies |
| `src/app/api/auth/verify/resend/route.ts`, `src/features/auth/server/actions/requestPasswordReset.ts` | Modified | OTP resend and password reset consume shared admission rate limits |
| `tests/gated-registration-admission.test.ts` | Created | Admission, Turnstile, CSRF, parity, env, and wiring coverage |
| Living documentation | Updated | README, CHANGELOG, architecture, security, testing, journal, and PR docs |

## Architecture Notes

- Invite expiry and registration-session expiry remain derived from timestamps; no persisted `EXPIRED` enum was added.
- The activation check is credential-scoped: provider-only ACTIVE users may have no password hash.
- `RegistrationSession` stores only `handleHash = sha256(handle)`; the raw cookie handle is never persisted.
- `AdminMfaFactor.secretCipher` and `keyVersion` establish the durable factor state consumed by later admin-elevation work.
- No `AdminStepUpChallenge`, email-OTP elevation, or SSO/passwordless admin bootstrap was added.
- Invite issue/lookup/redeem/revoke helpers store only SHA-256 token hashes; the raw invite token is returned only at issue time.
- The outbox worker re-reads rows under `FOR UPDATE SKIP LOCKED`, fences terminal transitions with `claimToken`, and treats unsupported DB event types as terminal failures rather than successful sends.
- Invitation delivery decrypts invite ciphertext only in memory, chooses keys by row `keyVersion`, emits the raw token only in the `/invite#token=...` fragment, and clears ciphertext on success or terminal failure.
- Turnstile replay rejection relies on Cloudflare `siteverify` single-use semantics; no local replay store was added.
- Registration, invite redemption, login, password reset, OTP verify, fragment exchange, and admin-operation admission dimensions are defined centrally for later route consumers.
- The production env contract now fails closed for Packet 02 Turnstile, internal-worker, invite-delivery, Admin-MFA keyring, and admin freshness controls.
- INCIDENT-P005 repaired the `OutboxEmail` schema contract before TASK-018 by adding `claimToken`, `leaseExpiresAt`, `nextAttemptAt`, `failedAt`, and `inviteCiphertext`.

## Test Plan

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm prisma:validate`
- [x] `pnpm exec vitest run tests/gated-registration-schema.test.ts`
- [x] `pnpm exec vitest run tests/gated-registration-invites.test.ts`
- [x] `pnpm exec vitest run tests/gated-registration-outbox.test.ts`
- [x] `pnpm exec vitest run tests/gated-registration-admission.test.ts`
- [x] `pnpm exec vitest run tests/auth-critical-flows.rate-limit.test.ts`
- [x] `pnpm exec vitest run tests/security-config-otp-seed-signup.test.ts`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test` - 194 tests across 17 files
- [x] `pnpm build` with required production env placeholders
- [x] `pnpm audit --audit-level=high` - no high/critical findings
- [x] `pnpm audit --prod --audit-level=high` - no high/critical findings

## Deployment Notes

Run the migration against a Neon branch before production deploy, then prove the manual rollback and re-apply path using the documented `down.sql`. The internal TASK-016 report records prior Neon up/down/up proof, but rerun it before shipping because INCIDENT-P005 changed the initial Packet 02 migration after that proof.

The runtime registration gate is not enabled by this PR. Keep `SELF_SERVICE_REGISTRATION_ENABLED=false` in production until the later Packet 02 runtime tasks pass their release gates.
