# ENTRY-24 - Packet 02 Gated Registration Schema Foundation

**Date:** 2026-06-21
**Type:** Feature Foundation
**Branch:** `feat/gated-registration`
**Version:** `1.9.0`
**PR:** `docs/pull-requests/PR-1.9.0.md`

---

## What I Did

Implemented the Packet 02 schema foundation for invite-gated registration. This adds the database state needed for account lifecycle control, invite redemption, transactional email outbox delivery, immutable audit events, explicit account linking, opaque registration sessions, and admin MFA factor posture/freshness. The user-facing invite flow is still future Packet 02 work; production remains protected by the existing registration kill switch until those runtime tasks ship.

## Files Touched

| File / Folder | Action | Notes |
|---------------|--------|-------|
| `package.json` | Modified | Version bumped to 1.9.0; existing security overrides retained |
| `pnpm-lock.yaml` | Modified | Lockfile synchronized with dependency override updates already present in the worktree |
| `prisma/schema.prisma` | Modified | Added Packet 02 enums, User lifecycle fields, Invite, OutboxEmail, AuditEvent, AccountLinkIntent, RegistrationSession, and AdminMfaFactor |
| `prisma/migrations/20260620173500_gated_registration_foundation/` | Created | Forward migration plus explicit `down.sql` rollback |
| `tests/gated-registration-schema.test.ts` | Created | 8 schema/migration invariant tests |
| `README.md` | Updated | Current capabilities, structure, and test count |
| `CHANGELOG.md` | Updated | 1.9.0 entry |
| `docs/ARCHITECTURE.md` | Updated | Persistence and gated-registration direction |
| `docs/SECURITY.md` | Updated | Registration and testing state |
| `docs/TESTING.md` | Updated | 14 files / 150 tests and new schema suite |
| `docs/cursor-task-reports/PACKET-02-gated-registration-reports/TASK-016-report.md` | Updated | Internal TASK-016 evidence and current sandbox caveats |

## Decisions

- **Schema foundation only:** kept TASK-016 scoped to Prisma schema, migration SQL, rollback SQL, tests, and docs. Runtime registration services/routes remain owned by later Packet 02 tasks.
- **Credential-scoped activation:** enforced only `ACTIVE AND hasPasswordCredential AND passwordHash IS NULL` at the DB layer, preserving provider-only ACTIVE accounts.
- **Opaque registration-session handle:** stored only `handleHash` and kept the raw handle out of persistence.
- **Real admin MFA state:** added `AdminMfaFactor` and `User.lastStrongAuthAt` without reviving the rejected `AdminStepUpChallenge` or email-OTP elevation model.

## Validation

```bash
pnpm install --frozen-lockfile        # passed
pnpm prisma:validate                 # passed
pnpm exec vitest run tests/gated-registration-schema.test.ts  # 8/8 passed
pnpm typecheck                       # passed
pnpm lint                            # passed
pnpm test                            # 150/150 passed across 14 files
pnpm build                           # passed with required production env placeholders
pnpm audit --audit-level=high        # passed; no high/critical findings
pnpm audit --prod --audit-level=high # passed; no high/critical findings
```

Plain `pnpm build` correctly failed without the Packet 01 required production env vars, then passed with local placeholder values for the required fail-closed settings. The audit gates currently pass at the high/critical threshold; low/moderate findings remain tracked under the existing P001 dependency notes.
