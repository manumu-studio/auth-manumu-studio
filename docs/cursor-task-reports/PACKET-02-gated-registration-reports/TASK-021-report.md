# TASK-021 Report - Admission, Enumeration, Turnstile, and Rate Limits

**Date:** 2026-06-21
**Branch/worktree:** `feat/gated-registration` at `/private/tmp/auth-manumu-security-hardening`
**Status:** TASK-021 shared admission foundation implemented and locally validated.

## Summary

Implemented the shared Packet 02 admission-control foundation:

- Added fail-closed production env requirements for Turnstile, internal worker auth, invite delivery encryption, Admin-MFA keyring, and admin freshness.
- Added a Cloudflare Turnstile `siteverify` wrapper with Zod response validation, hostname/action/freshness checks, outage fail-closed behavior, and support IDs.
- Added shared admission helpers for CSRF validation and generic enumeration-parity responses.
- Added centralized six-surface admission limiter wiring with independent per-IP, per-account, per-invite-hash, per-admin-actor, and global exchange-write checks where applicable.
- Wired the OTP resend and password reset surfaces to the shared admission limiter before expensive or account-revealing work.

## Files Changed

- `.env.example`
- `src/lib/env.ts`
- `src/lib/rateLimit.ts`
- `src/lib/rateLimitAdmission.ts`
- `src/lib/rateLimitIdentifiers.ts`
- `src/features/auth/lib/turnstile/index.ts`
- `src/features/auth/lib/turnstile/turnstile.types.ts`
- `src/features/auth/lib/turnstile/verifyTurnstileToken.ts`
- `src/features/auth/server/admission/admission.types.ts`
- `src/features/auth/server/admission/csrf.ts`
- `src/features/auth/server/admission/enumerationParity.ts`
- `src/features/auth/server/admission/index.ts`
- `src/app/api/auth/verify/resend/route.ts`
- `src/features/auth/server/actions/requestPasswordReset.ts`
- `tests/gated-registration-admission.test.ts`
- `tests/auth-critical-flows.rate-limit.test.ts`
- `tests/security-config-otp-seed-signup.test.ts`
- Living docs and `docs/incidents/INCIDENT-P004-packet02-env-test-fixture-drift.md`

## Environment Contract

Production now fails closed when any Packet 02 control-bearing value is absent or malformed:

| Variable | Contract |
|----------|----------|
| `TURNSTILE_SECRET_KEY` | Required in production |
| `TURNSTILE_EXPECTED_HOSTNAME` | Required in production |
| `TURNSTILE_EXPECTED_ACTION` | Required in production |
| `INTERNAL_WORKER_AUTH_SECRET` | Required in production, minimum 32 chars |
| `INVITE_DELIVERY_ENCRYPTION_KEY` | Required in production, 32-byte hex key |
| `INVITE_DELIVERY_KEY_VERSION` | Required in production |
| `ADMIN_MFA_SECRET_ENCRYPTION_KEYS` | Required in production, JSON version-to-32-byte-hex-key map |
| `ADMIN_MFA_SECRET_KEY_VERSION` | Required in production and must exist in the keyring |
| `ADMIN_ELEVATION_MAX_AGE_SECONDS` | Defaults to and validates as exactly `300` |

The registration-session cookie remains opaque and hash-at-rest; no registration-cookie signing key was added.

## Admission Call Ordering

Consumers should run admission before identity mutation or expensive work:

1. Parse cheap request inputs.
2. Derive trusted client IP through `getClientIp`.
3. Build all applicable limiter checks with `buildAdmissionRateLimitChecks`.
4. Apply each check independently through `rateLimit`.
5. Validate CSRF for state-changing POSTs with `validateCsrf`.
6. Verify Turnstile where the surface requires it.
7. Only then continue to password hashing, invite consumption, database mutation, or email delivery.

The over-limit and CSRF failure paths return the shared generic admission envelope without leaking which factor failed.

## Limiter Surface

| Surface | Dimensions |
|---------|------------|
| `fragment-exchange` | per-IP, per-invite-hash, global exchange-write |
| `registration` | per-IP, per-account, per-invite-hash |
| `invite-redemption` | per-IP, per-invite-hash |
| `login` | per-IP, per-account |
| `password-reset` | per-IP, per-account |
| `otp-verify` | per-IP, per-account |
| `admin-operation` | per-admin-actor, per-IP |

Raw emails and raw fragment tokens are never used directly in limiter keys. Account/admin identifiers are SHA-256 hashed after normalization. The invite dimension accepts a canonical SHA-256 token hash and hashes non-canonical inputs defensively.

The global exchange-write budget is exposed as the `global-exchange-write` scope and `exchange-write-global` policy. TASK-027 must consume it before creating `RegistrationSession` rows and must preserve response parity when the budget is exhausted.

## Shared Helper APIs

```ts
verifyTurnstileToken(input)
validateCsrf(input)
createGenericAdmissionFailure(status?)
padAdmissionTiming(startedAtMs, minDurationMs?)
buildAdmissionRateLimitChecks(input)
hashRateLimitIdentifier(value)
getClientIp(headers)
rateLimit(identifier, policy)
```

## Enumeration-Parity Evidence

- Public and admin admission denials use the same generic body shape and status.
- CSRF failures for missing origin, cross-site fetch, missing token, and mismatched token normalize to the same body.
- OTP resend and password reset return generic admission failures before account lookup or resend execution when any limiter dimension is exhausted.
- Internal support IDs are generated, but failure reasons such as CSRF, Turnstile, invite, allowlist, MFA, or capability are not exposed in public bodies.

Final end-to-end parity across registration, invite redemption, admin mutation, and fragment-exchange routes remains owned by TASK-028 after those consumers exist.

## Validation

| Command | Result |
|---|---:|
| `pnpm prisma:validate` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm exec vitest run tests/gated-registration-admission.test.ts` | PASS, 27/27 |
| `pnpm exec vitest run tests/auth-critical-flows.rate-limit.test.ts` | PASS, 3/3 |
| `pnpm exec vitest run tests/security-config-otp-seed-signup.test.ts` | PASS, 32/32 |
| `pnpm test` | PASS, 182/182 across 16 files |
| `pnpm build` with required production env placeholders | PASS |
| `pnpm audit --audit-level=high` | PASS, no high/critical findings |
| `pnpm audit --prod --audit-level=high` | PASS, no high/critical findings |

An initial full-suite run exposed `INCIDENT-P004`: the legacy production-env happy-path fixture omitted the new Packet 02 required secrets. The fixture was corrected and the incident resolved.

## Handoff

- TASK-018 consumes the env contract for invite-delivery encryption and internal worker authentication.
- TASK-019 consumes registration and login limiter checks plus shared parity/CSRF helpers.
- TASK-023 consumes the shared CSRF helper for linking ceremony POSTs.
- TASK-025 consumes `ADMIN_ELEVATION_MAX_AGE_SECONDS` and shared CSRF/parity helpers for Admin MFA enroll/verify/elevation refresh.
- TASK-026 consumes admin-operation limiter checks and generic admin admission parity.
- TASK-027 consumes fragment-exchange and invite-redemption limiter checks, including the global exchange-write budget, plus shared CSRF/parity helpers.
- TASK-028 must prove final end-to-end parity, storage-amplification behavior, and consumer wiring across all Packet 02 runtime routes.
