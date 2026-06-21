# CP-002 — Merge Documentation Baseline and Start Security TASK-010

**Date:** 2026-06-19
**Branch:** `docs/security-baseline`
**Status:** READY

You are resuming work on the Manumu Studio authentication and OIDC service.

## Current state

- Living documentation was synchronized with the current codebase and applicable LSA engineering standards.
- Historical audits, journal entries, and PR snapshots were not retroactively modified.
- Validation passed: ESLint, TypeScript, 32 tests, production build, OpenAPI parsing, documentation links, and formatting.
- Commit `b155ca3d` (`docs(project): synchronize security baseline and living documentation`) was pushed to `origin/docs/security-baseline`.
- The GitHub PR title/body were prepared, but this session did not confirm that the PR was created or merged.
- `fix/security-hardening-now` already exists at the old `main` commit `10980568`.
- Unrelated OAuth client scripts and `PR-1.8.2.md` remain safe in `stash@{0}`.

## Persistent user instruction

- Do not create or update `docs/language/ENGLISH_LOG.md`.
- Do not provide automatic English corrections unless the user explicitly requests them.

## The one next action

Confirm/create the documentation PR, wait for CI, and merge it. Then update local `main`, bring `fix/security-hardening-now` onto the updated `main`, and begin:

`docs/cursor-tasks/PACKET-security-hardening-now/TASK-010`

TASK-010 covers dependency and lockfile hygiene, including the intentionally deferred stale `package-lock.json`.

## Blockers and cautions

- Update the Git remote because GitHub reported that the repository moved:
  `git@github.com:manumu-studio/auth-manumu-studio.git`
- Do not pop `stash@{0}` into the security-hardening branch.
- Do not mix the documentation PR with security implementation.
- Git write operations require user approval.

## Read these files

1. `docs/session-prompts/002-2026-06-19-docs-security-baseline.md`
2. `docs/build-packets/PACKET-security-hardening-now.md`
3. `docs/cursor-tasks/PACKET-security-hardening-now/TASK-010`
4. `docs/incidents/INCIDENT-P001-auth-security-exposure.md`
5. `docs/audits/AUDIT-V1-AUTH-MANUMU-STUDIO.md`
6. `docs/SECURITY.md`
