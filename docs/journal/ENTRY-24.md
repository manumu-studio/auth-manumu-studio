# ENTRY-24 - Packet 02 Gated Registration Schema Foundation

**Date:** 2026-06-21
**Type:** Feature Foundation
**Branch:** `feat/gated-registration`
**Version:** `1.9.0`
**PR:** `docs/pull-requests/PR-1.9.0.md`

---

## What I Did

Implemented the Packet 02 schema foundation, first invite lifecycle service slice, and shared admission-control foundation for invite-gated registration. This adds the database state needed for account lifecycle control, invite redemption, transactional email outbox delivery, immutable audit events, explicit account linking, opaque registration sessions, and admin MFA factor posture/freshness; server-only invite issue/lookup/redeem/revoke helpers; and reusable Turnstile, CSRF, enumeration-parity, production-env, and rate-limit admission helpers. The user-facing invite flow is still future Packet 02 work; production remains protected by the existing registration kill switch until those runtime tasks ship.

## Files Touched

| File / Folder | Action | Notes |
|---------------|--------|-------|
| `package.json` | Modified | Version bumped to 1.9.0; existing security overrides retained |
| `pnpm-lock.yaml` | Modified | Lockfile synchronized with dependency override updates already present in the worktree |
| `prisma/schema.prisma` | Modified | Added Packet 02 enums, User lifecycle fields, Invite, OutboxEmail, AuditEvent, AccountLinkIntent, RegistrationSession, and AdminMfaFactor |
| `prisma/migrations/20260620173500_gated_registration_foundation/` | Created | Forward migration plus explicit `down.sql` rollback |
| `tests/gated-registration-schema.test.ts` | Created | 8 schema/migration invariant tests |
| `src/features/auth/server/invites/` | Created | Server-only invite lifecycle service foundation |
| `tests/gated-registration-invites.test.ts` | Created | 5 invite lifecycle invariant tests |
| `src/features/auth/server/admission/` | Created | Shared CSRF and enumeration-parity admission helpers |
| `src/features/auth/lib/turnstile/` | Created | Fail-closed Cloudflare Turnstile siteverify wrapper |
| `src/lib/rateLimitAdmission.ts`, `src/lib/rateLimitIdentifiers.ts` | Created | Six-surface admission limiter dimensions and hashed identifiers |
| `src/lib/env.ts`, `.env.example` | Modified | Packet 02 production env contract and documented required variables |
| `src/lib/rateLimit.ts` | Modified | Packet 02 admission policies and re-exports |
| `src/app/api/auth/verify/resend/route.ts`, `src/features/auth/server/actions/requestPasswordReset.ts` | Modified | OTP resend and password reset now consume shared admission limits |
| `tests/gated-registration-admission.test.ts` | Created | 27 admission, Turnstile, CSRF, parity, env, and wiring tests |
| `README.md` | Updated | Current capabilities, structure, and test count |
| `CHANGELOG.md` | Updated | 1.9.0 entry |
| `docs/ARCHITECTURE.md` | Updated | Persistence and gated-registration direction |
| `docs/SECURITY.md`, `docs/DEPLOYMENT.md` | Updated | Production env, registration, admission, and testing state |
| `docs/TESTING.md` | Updated | 16 files / 182 tests and new gated-registration suites |
| `docs/cursor-task-reports/PACKET-02-gated-registration-reports/TASK-016-report.md`, `TASK-017-report.md`, `TASK-021-report.md` | Updated/created | Internal task evidence and handoffs |

## Decisions

- **Schema foundation only:** kept TASK-016 scoped to Prisma schema, migration SQL, rollback SQL, tests, and docs. Runtime registration services/routes remain owned by later Packet 02 tasks.
- **Credential-scoped activation:** enforced only `ACTIVE AND hasPasswordCredential AND passwordHash IS NULL` at the DB layer, preserving provider-only ACTIVE accounts.
- **Opaque registration-session handle:** stored only `handleHash` and kept the raw handle out of persistence.
- **Real admin MFA state:** added `AdminMfaFactor` and `User.lastStrongAuthAt` without reviving the rejected `AdminStepUpChallenge` or email-OTP elevation model.
- **Hash-only invite service:** invite issuance returns the raw token once, persists only `sha256(rawToken)`, and keeps lookup/redeem failures generic.
- **Admission ownership:** centralized Packet 02 limiter dimensions, trusted-IP consumption, CSRF validation, generic admission parity, Turnstile validation, and production env enforcement in TASK-021-owned helpers.
- **Test-fixture correction:** filed and resolved `INCIDENT-P004` when the legacy production env test fixture omitted the new Packet 02 required secrets.

## Validation

```bash
pnpm install --frozen-lockfile        # passed
pnpm prisma:validate                 # passed
pnpm exec vitest run tests/gated-registration-schema.test.ts  # 8/8 passed
pnpm exec vitest run tests/gated-registration-invites.test.ts # 5/5 passed
pnpm exec vitest run tests/gated-registration-admission.test.ts # 27/27 passed
pnpm exec vitest run tests/auth-critical-flows.rate-limit.test.ts # 3/3 passed
pnpm exec vitest run tests/security-config-otp-seed-signup.test.ts # 32/32 passed
pnpm typecheck                       # passed
pnpm lint                            # passed
pnpm test                            # 182/182 passed across 16 files
pnpm build                           # passed with required production env placeholders
pnpm audit --audit-level=high        # passed; no high/critical findings
pnpm audit --prod --audit-level=high # passed; no high/critical findings
```

Plain `pnpm build` correctly failed without the Packet 01 required production env vars, then passed with local placeholder values for the required fail-closed settings. The audit gates currently pass at the high/critical threshold; low/moderate findings remain tracked under the existing P001 dependency notes.
