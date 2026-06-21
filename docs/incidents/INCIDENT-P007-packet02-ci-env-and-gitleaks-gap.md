---
id: INCIDENT-P007
date: 2026-06-21
severity: SEV-4
status: VERIFYING
packet: PACKET-02-gated-registration
branch: feat/gated-registration
environment: ci-pipeline
detected_by: user-report
related_incidents:
  - INCIDENT-P006
  - INCIDENT-P004
  - INCIDENT-P001-CI
fix_pr: null
---

# INCIDENT-P007 - Packet 02 CI Env and Gitleaks Gap

## Prior Incident Check

- **Registry checked:** yes
- **Search terms:** `CI build-test`, `vercel-like-build`, `security-audit`, `TURNSTILE_SECRET_KEY is required in production`, `gitleaks generic-api-key`, `tests/gated-registration-admission.test.ts`, `tests/security-config-otp-seed-signup.test.ts`
- **Candidate incidents:** `INCIDENT-P006`, `INCIDENT-P004`, `INCIDENT-P001-CI`
- **Classification:** related but distinct
- **Action:** create linked child incident

## Problem

### Symptoms

- GitHub PR #30 reports failing `CI / build-test`, `CI / vercel-like-build`, and `CI / security-audit`.
- `build-test` fails during `pnpm build` because the GitHub Actions build env lacks the eight new Packet 02 production-required env variables.
- `security-audit` fails because gitleaks flags deterministic fake Turnstile fixture values in test history as `generic-api-key` findings.

### Impact

- **Users affected:** none directly
- **Features broken:** PR CI verification for Packet 02
- **Data at risk:** no
- **Workaround exists:** yes; patch CI env setup and secret-scan allowlist for known non-secret fixtures

### Reproduction Steps

1. Run PR #30 CI for branch `feat/gated-registration`.
2. Observe `build-test` and `vercel-like-build` fail during production build env validation.
3. Observe `security-audit` fail in gitleaks history scan.

### Evidence

```text
build-test:
TURNSTILE_SECRET_KEY is required in production
TURNSTILE_EXPECTED_HOSTNAME is required in production
TURNSTILE_EXPECTED_ACTION is required in production
INTERNAL_WORKER_AUTH_SECRET is required in production
INVITE_DELIVERY_ENCRYPTION_KEY is required in production
INVITE_DELIVERY_KEY_VERSION is required in production
ADMIN_MFA_SECRET_ENCRYPTION_KEYS is required in production
ADMIN_MFA_SECRET_KEY_VERSION is required in production

security-audit:
RuleID: generic-api-key
File: tests/security-config-otp-seed-signup.test.ts
File: tests/gated-registration-admission.test.ts
Commit: 016d6beb30d7f4d313028135a6c5e66d4819744f
```

### Files Suspected

| File | Why suspected |
|------|--------------|
| `.github/workflows/ci.yml` | CI build env predates Packet 02 production env requirements |
| `.gitleaks.toml` | Missing repo-local false-positive policy for deterministic test fixtures |
| `tests/gated-registration-admission.test.ts` | Contains fake Turnstile fixture value flagged by gitleaks |
| `tests/security-config-otp-seed-signup.test.ts` | Contains fake Turnstile fixture value flagged by gitleaks |

### Root Cause Hypothesis

> Packet 02 correctly expanded the fail-closed production env contract, but the CI build fixtures and gitleaks configuration were not expanded at the same time.

### What's Blocked

- PR #30 CI completion.
- Merge readiness for Packet 02.

## Resolution

### Contributing Factors

1. **Factor:** CI build fixture drift.
   - **How it contributed:** GitHub Actions ran production builds without Packet 02 env values.
   - **Why it was not caught earlier:** Local production build was verified with shell-provided placeholders, not the Actions env block.
2. **Factor:** Secret-scan fixture policy gap.
   - **How it contributed:** gitleaks scanned PR history and interpreted fake Turnstile fixture strings as generic API keys.
   - **Why it was not caught earlier:** Local audit used dependency audit only; full history gitleaks runs in CI.

### Was the Hypothesis Correct?

Yes. Local reproduction of the CI build env shape passed after generating the eight Packet 02 env values, and gitleaks v8.24.3 stopped reporting the historical fake Turnstile fixture once the repo-local allowlist extended the default rules.

### Files Changed

| File | Change | Why |
|------|--------|-----|
| `.github/workflows/ci.yml` | Generated ephemeral Packet 02 values before both production build jobs | Keep CI aligned with fail-closed env validation without committing secret-shaped literals |
| `.gitleaks.toml` | Extended default gitleaks rules and allowlisted the historical fake Turnstile fixture | Preserve secret scanning while suppressing the known deterministic non-secret fixture |
| `tests/gated-registration-admission.test.ts` | Replaced current fake Turnstile fixture with lower-risk test wording | Reduce future false-positive risk |
| `tests/security-config-otp-seed-signup.test.ts` | Replaced current fake Turnstile fixture with lower-risk test wording | Reduce future false-positive risk |

### Fix Approach

Generate ephemeral CI-only Packet 02 values in Actions rather than hardcoding secret-shaped strings, and add a narrow gitleaks allowlist for the exact historical fake Turnstile fixture already present in this PR.

### Regression Risk

- Low: changes are limited to CI fixture wiring and test fixture literals.

### Testing Done

- [x] Unit tests pass: `pnpm test`
- [x] TypeScript passes: `pnpm typecheck`
- [x] Lint passes: `pnpm lint`
- [x] Production build passes with generated Packet 02 env: `pnpm build`
- [x] Dependency audit high gate passes: `pnpm audit --audit-level=high && pnpm audit --prod --audit-level=high`
- [x] gitleaks history scan passes with v8.24.3: `go run github.com/zricethezav/gitleaks/v8@v8.24.3 detect ...`
- [x] gitleaks current-dir scan passes for `.github` and `tests`
- [ ] GitHub Actions rerun passes after push

### Timeline

| Time (UTC) | Event |
|------------|-------|
| 02:01 | CI logs inspected and root causes identified |
| 02:01 | P007 opened before fix |
| 02:04 | Local build, tests, lint, typecheck, audit, and gitleaks verification passed |

### Lessons Learned

**What went well:**
- CI logs clearly separated build env validation from secret scanning.

**What could be better:**
- CI env fixtures and secret-scan policy should be updated in the same packet that expands production-required env vars.

### Action Items

| Action | Owner | Deadline | Status | Tracking |
|--------|-------|----------|--------|----------|
| Add Packet 02 env generation to CI production build jobs | Codex | 2026-06-21 | DONE | This incident |
| Add narrow gitleaks false-positive allowlist | Codex | 2026-06-21 | DONE | This incident |
| Re-run CI after push | Manu | 2026-06-21 | TODO | PR #30 |

## Conclusion

Packet 02 CI failed because the Actions build fixture and gitleaks policy lagged behind the new production env contract. The local fix now generates ephemeral build-only values in CI and allowlists only the deterministic fake Turnstile fixture already present in PR history; final resolution is pending the pushed GitHub Actions run.
