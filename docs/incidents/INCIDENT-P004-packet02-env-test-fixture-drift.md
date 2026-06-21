---
id: INCIDENT-P004
date: 2026-06-21
severity: SEV-4
status: RESOLVED
packet: PACKET-02-gated-registration
branch: feat/gated-registration
environment: local
detected_by: developer
related_incidents:
  - INCIDENT-P001
  - INCIDENT-P001-DEPLOY
fix_pr: null
---

# INCIDENT-P004 - Packet 02 Production Env Test Fixture Drift

## Prior Incident Check

- **Registry checked:** yes
- **Search terms:** `TURNSTILE_SECRET_KEY`, `fully-configured production environment`, `ADMIN_MFA_SECRET_ENCRYPTION_KEYS`, `production env validation`, `ZodError`
- **Candidate incidents:** `INCIDENT-P001`, `INCIDENT-P001-DEPLOY`
- **Classification:** related but distinct
- **Action:** create linked child incident

## Problem

### Symptoms

- `pnpm test` fails one existing production environment validation test:
  `tests/security-config-otp-seed-signup.test.ts > Production env validation > accepts a fully-configured production environment`.
- The test fixture claims to be fully configured for production, but it omits the Packet 02 production-required controls:
  `TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_HOSTNAME`, `TURNSTILE_EXPECTED_ACTION`,
  `INTERNAL_WORKER_AUTH_SECRET`, `INVITE_DELIVERY_ENCRYPTION_KEY`,
  `INVITE_DELIVERY_KEY_VERSION`, `ADMIN_MFA_SECRET_ENCRYPTION_KEYS`, and
  `ADMIN_MFA_SECRET_KEY_VERSION`.

### Impact

- **Users affected:** none
- **Features broken:** local test suite only
- **Data at risk:** no
- **Workaround exists:** yes; run targeted Packet 02 admission tests, but the full suite remains blocked until the fixture is corrected

### Reproduction Steps

1. Check out `/private/tmp/auth-manumu-security-hardening` on `feat/gated-registration`.
2. Run `pnpm test`.
3. Observe 1 failed test and 181 passed tests.

### Evidence

```text
FAIL tests/security-config-otp-seed-signup.test.ts > Production env validation > accepts a fully-configured production environment
ZodError:
TURNSTILE_SECRET_KEY is required in production
TURNSTILE_EXPECTED_HOSTNAME is required in production
TURNSTILE_EXPECTED_ACTION is required in production
INTERNAL_WORKER_AUTH_SECRET is required in production
INVITE_DELIVERY_ENCRYPTION_KEY is required in production
INVITE_DELIVERY_KEY_VERSION is required in production
ADMIN_MFA_SECRET_ENCRYPTION_KEYS is required in production
ADMIN_MFA_SECRET_KEY_VERSION is required in production
```

### Files Suspected

| File | Why suspected |
|------|--------------|
| `tests/security-config-otp-seed-signup.test.ts` | `buildProdBaseEnv()` predates Packet 02's production-required env contract |
| `src/lib/env.ts` | Correctly enforces the new fail-closed Packet 02 production secrets |

### Root Cause Hypothesis

> The Packet 02 env contract was updated correctly, and the new dedicated admission tests cover the new production requirements. The older production-env happy-path fixture was not updated to include those new required controls, so the legacy "fully configured" fixture is no longer fully configured.

### What's Blocked

- Full `pnpm test` release-gate evidence.
- TASK-021 completion/reporting until the full suite is green.

## Resolution

### Contributing Factors

1. **Env contract expanded in a new dedicated suite**
   - **How it contributed:** `tests/gated-registration-admission.test.ts` proved the new Packet 02 env requirements, but the older production-env happy-path fixture still represented the Packet 01 production contract.
   - **Why it was not caught earlier:** Targeted Packet 02 admission tests and typecheck passed; the stale legacy fixture only surfaced on the full `pnpm test` run.

2. **Fixture duplication**
   - **How it contributed:** The production env values were duplicated across test files instead of using one shared builder.
   - **Why it was not caught earlier:** The duplicated fixture stayed valid until TASK-021 added new production-required controls.

### Was the Hypothesis Correct?

> Yes. `src/lib/env.ts` was enforcing the intended Packet 02 production contract. The failing test fixture was incomplete.

### Files Changed

| File | Change | Why |
|------|--------|-----|
| `tests/security-config-otp-seed-signup.test.ts` | Added Packet 02 production-required env values to `buildProdBaseEnv()` | Makes the legacy "fully configured production environment" fixture match the current env contract |
| `docs/incidents/INCIDENT_REGISTRY.md` | Moved this incident through active tracking to resolved | Preserves the test-regression record |
| `docs/cursor-task-reports/PACKET-02-gated-registration-reports/TASK-021-report.md` | Recorded the incident and verification evidence | Documents TASK-021 completion and handoff |

### Fix Approach

> Update the legacy production env fixture with the same Packet 02 control-bearing secrets required by `src/lib/env.ts`: Turnstile, internal worker auth, invite delivery encryption, Admin-MFA keyring/write version, and admin freshness.

### Regression Risk

- Low. The change only expands a test fixture. The env schema remains fail-closed, and dedicated admission tests still verify missing/malformed values reject production boot.

### Testing Done

- [x] Unit tests pass
- [x] Integration tests pass
- [ ] Manual verification in target environment
- [x] Edge cases tested

### Timeline

| Time (UTC) | Event |
|------------|-------|
| 23:30 | Full `pnpm test` failure detected |
| 23:30 | Prior incident check completed |
| 23:30 | Incident created |
| 23:31 | Test fixture corrected |
| 23:31 | `tests/security-config-otp-seed-signup.test.ts` passed |
| 23:31 | Full `pnpm test` passed: 182/182 across 16 files |
| 23:34 | Incident resolved |

### Lessons Learned

**What went well:**
- The new fail-closed Packet 02 env contract rejected an incomplete production fixture.

**What could be better:**
- Shared production-env fixtures should be updated in the same task that expands the env contract.

### Action Items

| Action | Owner | Deadline | Status | Tracking |
|--------|-------|----------|--------|----------|
| Update the legacy production env fixture with Packet 02 required controls | Codex | 2026-06-21 | DONE | This incident |

## Conclusion

Packet 02 correctly expanded the production env contract, but one legacy production-env happy-path fixture still omitted the new required secrets. The fixture now matches the current contract, and the full test suite is green again.
