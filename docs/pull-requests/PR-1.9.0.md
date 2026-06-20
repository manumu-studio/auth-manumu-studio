# PR-1.9.0 - Add Packet 02 Gated Registration Schema Foundation

**Journal:** `ENTRY-24`
**Branch:** `feat/gated-registration`
**Version:** `1.9.0`
**Date:** `2026-06-21`
**Status:** Draft validation complete locally

---

## Summary

This PR adds the Packet 02 database foundation for invite-gated registration. It does not expose the user-facing invite flow yet. Instead, it prepares the durable state later tasks need: account lifecycle status, invite lifecycle, transactional outbox rows, immutable audit rows, explicit account-link intents, opaque registration sessions, and admin MFA factor state.

## Files Changed

| File or Area | Action | Notes |
|--------------|--------|-------|
| `package.json` | Modified | Version bumped to 1.9.0; security overrides retained |
| `pnpm-lock.yaml` | Modified | Lockfile reflects existing dependency override updates |
| `prisma/schema.prisma` | Modified | Packet 02 schema foundation |
| `prisma/migrations/20260620173500_gated_registration_foundation/` | Created | Forward migration and manual rollback `down.sql` |
| `tests/gated-registration-schema.test.ts` | Created | Schema/migration invariant coverage |
| Living documentation | Updated | README, CHANGELOG, architecture, security, testing, journal, and PR docs |

## Architecture Notes

- Invite expiry and registration-session expiry remain derived from timestamps; no persisted `EXPIRED` enum was added.
- The activation check is credential-scoped: provider-only ACTIVE users may have no password hash.
- `RegistrationSession` stores only `handleHash = sha256(handle)`; the raw cookie handle is never persisted.
- `AdminMfaFactor.secretCipher` and `keyVersion` establish the durable factor state consumed by later admin-elevation work.
- No `AdminStepUpChallenge`, email-OTP elevation, or SSO/passwordless admin bootstrap was added.

## Test Plan

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm prisma:validate`
- [x] `pnpm exec vitest run tests/gated-registration-schema.test.ts`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test` - 150 tests across 14 files
- [x] `pnpm build` with required production env placeholders
- [x] `pnpm audit --audit-level=high` - no high/critical findings
- [x] `pnpm audit --prod --audit-level=high` - no high/critical findings

## Deployment Notes

Run the migration against a Neon branch before production deploy, then prove the manual rollback and re-apply path using the documented `down.sql`. The internal TASK-016 report records prior Neon up/down/up proof; rerun if the branch has changed before shipping.

The runtime registration gate is not enabled by this PR. Keep `SELF_SERVICE_REGISTRATION_ENABLED=false` in production until the later Packet 02 runtime tasks pass their release gates.
