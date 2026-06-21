# Testing

**Version:** 1.9.0

## Current State

- Runner: Vitest `^4.1.9`
- Environment: Node
- Discovery: `tests/**/*.test.ts`
- Current test files: 16
- Current tests: 182
- Coverage thresholds: not configured
- Playwright E2E: not configured
- CI: Vitest runs in the parallel `test-coverage` job; dependency audits run
  in the parallel `security-audit` job

Current suites cover:

- signup and password hashing;
- OTP verification and rate limiting;
- OAuth authorize validation;
- OAuth token exchange;
- JWKS and OIDC discovery;
- CI config and audit gate;
- distributed rate-limit foundation, fail-closed behavior, and IP extraction;
- OAuth token and UserInfo rate limits;
- mandatory S256 PKCE and plain rejection;
- atomic authorization-code consumption and replay prevention;
- HMAC OTP creation and verification, seed safety, and registration kill switch;
- Packet 02 gated-registration schema, migration, invite lifecycle, admission, Turnstile, CSRF, parity, and limiter invariants.

Baseline verification on 2026-06-21: 16 files and 182 tests passed.

## Commands

```bash
pnpm test
pnpm test:watch
pnpm typecheck
pnpm lint
pnpm build
```

## Security Test Suites Added in 1.8.5

The following six suites were introduced in the 1.8.5 security hardening
release. All items previously listed under "Security-Hardening Test
Requirements" are now covered.

| File | Tests | Coverage area |
|------|-------|---------------|
| `tests/security-ci-config.test.ts` | 14 | CI config and audit gate |
| `tests/security-rate-limit-foundation.test.ts` | 20 | Distributed limiter foundation, fail-closed behavior, IP extraction |
| `tests/security-oauth-rate-limits.test.ts` | 12 | OAuth token and UserInfo rate limits |
| `tests/security-pkce-s256.test.ts` | 25 | Mandatory S256, plain rejection, constant-time comparison |
| `tests/security-auth-code-concurrency.test.ts` | 7 | Atomic code consumption, replay prevention |
| `tests/security-config-otp-seed-signup.test.ts` | 32 | HMAC OTP, seed safety, registration kill switch |

## Gated-Registration Suites Added in 1.9.0

| File | Tests | Coverage area |
|------|-------|---------------|
| `tests/gated-registration-schema.test.ts` | 8 | Packet 02 schema, migration, registration-session, outbox, audit, and admin-MFA invariants |
| `tests/gated-registration-invites.test.ts` | 5 | Invite issuance, lookup, redemption CAS, reuse audit/alert, and revocation invariants |
| `tests/gated-registration-admission.test.ts` | 27 | Packet 02 env fail-closed contract, Turnstile verifier, CSRF/parity helpers, limiter dimensions, and reset/OTP admission wiring |

## Gated-Registration Runtime Test Requirements

These remain future work, to be addressed when the invite/allowlist runtime gate is
implemented:

- atomic invite consumption with user creation;
- allowlist behavior;
- disposable-email rejection;
- end-to-end parity evidence across final registration and invite-redemption routes;
- consumer wiring for final registration, fragment-exchange, invite-redemption, admin, and linking surfaces.

## LSA Target State

- Unit, integration, and Playwright E2E suites.
- Coverage thresholds enforced in CI.
- Parallel `test-coverage` job.
- Real PostgreSQL service for E2E.
- Golden-path tests for every relying party.
- Accessibility assertions for interactive auth components.
- Test artifacts uploaded on failure.

Tests and scripts may be exempt from file-length limits, but not from type
safety, determinism, security, or readability.
