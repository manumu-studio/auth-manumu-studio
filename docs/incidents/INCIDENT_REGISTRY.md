# Incident Registry

Track production, CI, test, build, and development-workflow incidents here.

> **Mandatory diagnostic Step 0:** Check this registry before forming a
> hypothesis or creating an incident. Search active and resolved incidents,
> report whether the failure is a recurrence, related-but-distinct, or new, and
> link/reopen incidents instead of duplicating them.

## Active

| ID | Date | Severity | Status | Summary | Owner |
|----|------|----------|--------|---------|-------|
| INCIDENT-P007 | 2026-06-21 | SEV-4 | VERIFYING | Packet 02 PR CI lacks new build env fixtures and gitleaks flags fake Turnstile test fixtures | Manu / Codex |
| INCIDENT-P006 | 2026-06-21 | SEV-4 | VERIFYING | Vercel Preview deployment for `feat/gated-registration` lacked eight new Packet 02 env variables | Manu |
| INCIDENT-P001 | 2026-06-17 | SEV-2 | INVESTIGATING | Production-facing auth exposure: open registration, ineffective rate-limit fallback, vulnerable dependencies, and OAuth/OTP hardening gaps | Manu / Codex |

## Follow-up Items

| Task | Added | Context |
|------|-------|---------|
| Real-Postgres concurrency test for atomic auth-code claim | 2026-06-19 | TASK-014 added a mock-based concurrency test in `tests/security-auth-code-concurrency.test.ts`. That mock proves code-path correctness but not DB-level atomicity. A real integration test using an isolated Postgres database (testcontainers or a dedicated CI Neon branch) is needed to provide true database-level proof that two concurrent `updateMany` transactions cannot both set `usedAt` on the same row. Blocks closing INCIDENT-P001 fully. |
| Add local pre-push release barrier and dedicated script typecheck | 2026-06-20 | INCIDENT-P001-CI was deployed, but local pushes still need a canonical release gate and standalone scripts need explicit TypeScript coverage. |
| Enable branch protection with required CI and Vercel checks | 2026-06-20 | Packet 01 merged while the repository had no enabled required-check ruleset. Require CI and deployment success before future merges. |

## Resolved

| ID | Date | Severity | Resolved | Summary | PR |
|----|------|----------|----------|---------|----|
| INCIDENT-P009 | 2026-06-21 | SEV-4 | 2026-06-21 | Packet 02 governing evidence list now cites available authoritative artifacts | n/a |
| INCIDENT-P008 | 2026-06-21 | SEV-4 | 2026-06-21 | Incident registry conflict markers removed and Step 0 registry readability restored | n/a |
| INCIDENT-P005 | 2026-06-21 | SEV-4 | 2026-06-21 | TASK-018 outbox schema contract aligned with committed `eventType`/aggregate/user mapping; no payload JSONB column added | n/a |
| INCIDENT-P004 | 2026-06-21 | SEV-4 | 2026-06-21 | Packet 02 production env contract expanded, but the legacy fully-configured production test fixture omitted the new required secrets | n/a |
| INCIDENT-P003 | 2026-06-20 | SEV-4 | 2026-06-21 | Packet 02 vendor-review egress gate resolved by RUN 6 PASS/GO artifacts and secret-pattern check | n/a |
| INCIDENT-P001-CI | 2026-06-20 | SEV-4 | 2026-06-20 | Explicit Prisma generation repaired the cached clean-runner build path; follow-up local/server barriers remain tracked | #29 |
| INCIDENT-P001-DEPLOY | 2026-06-20 | SEV-4 | 2026-06-20 | Dedicated Preview OAuth signing keys restored deploy previews and production verification passed | #29 |
