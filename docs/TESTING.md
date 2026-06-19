# Testing

**Version:** 1.8.4

## Current State

- Runner: Vitest
- Environment: Node
- Discovery: `tests/**/*.test.ts`
- Current test files: 7
- Current tests: 32
- Coverage thresholds: not configured
- Playwright E2E: not configured
- CI: tests run inside the sequential `build-test` job

Current suites cover:

- signup and password hashing;
- OTP verification and rate limiting;
- OAuth authorize validation;
- OAuth token exchange;
- JWKS and OIDC discovery.

Baseline verification on 2026-06-19: 7 files and 32 tests passed.

## Commands

```bash
pnpm test
pnpm test:watch
pnpm typecheck
pnpm lint
pnpm build
```

## Security-Hardening Test Requirements

Phase 0 must add durable tests for:

- production Upstash requirement;
- trusted platform IP extraction;
- OAuth token/UserInfo rate limits;
- token response `Cache-Control: no-store`;
- S256-only PKCE;
- concurrent authorization-code redemption;
- HMAC OTP creation and verification;
- seed/config safety.

## Gated-Registration Test Requirements

- invite issue, expiry, and single use;
- atomic invite consumption with user creation;
- allowlist behavior;
- Turnstile success/failure;
- disposable-email rejection;
- enumeration-safe responses;
- per-IP and per-email abuse limits.

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
