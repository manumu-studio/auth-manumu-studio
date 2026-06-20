# PR-1.8.5 — Harden Authentication and OAuth Controls

**Journal:** `ENTRY-23`
**Branch:** `feat/security-hardening` → `main`
**Version:** `1.8.5`
**Date:** `2026-06-20`
**Status:** ✅ Ready to merge (all gates pass; production golden-path verification listed as pending post-deploy)

---

## Summary

This release hardens the OIDC authorization server across eight interconnected security dimensions: dependency hygiene and CI blocking, distributed rate limiting, OAuth endpoint protection, mandatory PKCE S256, atomic authorization-code consumption, HMAC-keyed OTP storage, strict production environment enforcement, and a registration kill switch with a safe database seed.

The previous release established a documentation baseline and named these gaps in an incident record. This release closes those gaps at the code and CI level. All release gates pass. Production golden-path verification is the final step before the incident is closed.

## Files Changed

| File or Area | Action | Notes |
|--------------|--------|-------|
| `package.json` | Modified | Version 1.8.5; `next`/`eslint-config-next` → `^15.5.19`, `next-auth` → `^4.24.12`, Vitest → `^4.1.9`, `vite` → `^6.4.3`; `package-lock.json` removed |
| `pnpm-lock.yaml` | Modified | Updated after dependency upgrades |
| `.github/workflows/` | Modified | Blocking `security-audit` job, gitleaks full-history scan, frozen pnpm install |
| `vercel.json` | Modified | `SKIP_ENV_VALIDATION` removed |
| `src/lib/env.ts` | Modified | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `OTP_HMAC_SECRET`, `SELF_SERVICE_REGISTRATION_ENABLED` now required in production |
| `src/lib/rateLimit.ts` | Rearchitected | Fail-closed distributed limiter; 7-policy surface map; Vercel-aware IP extraction |
| `src/app/oauth/token/route.ts` | Modified | Zod-validated body, independent per-IP and per-client-id rate limits, `Cache-Control: no-store` on all responses |
| `src/app/oauth/userinfo/route.ts` | Modified | Independent per-IP and per-token-fingerprint rate limits |
| `src/features/auth/server/oauth/authorizeRequest.ts` | Modified | S256 required; `plain` rejected; missing `code_challenge` rejected |
| `src/features/auth/server/oauth/token.ts` | Modified | Atomic code consumption; constant-time challenge comparison; S256 enforced for all clients |
| `src/app/.well-known/openid-configuration/route.ts` | Modified | Discovery advertises `code_challenge_methods_supported: ["S256"]` only |
| `src/features/auth/server/verify/createToken.ts` | Modified | OTP stored as `HMAC-SHA256(code, OTP_HMAC_SECRET)`; shared `hashOtpCode` is reused by the consume path, so both create and verify use the keyed HMAC |
| `src/features/auth/server/actions/signup.ts`, `src/features/auth/server/oauth/actions/signup.ts` | Modified | Registration kill switch via `SELF_SERVICE_REGISTRATION_ENABLED` on both first-party and OAuth signup |
| `prisma/seed.ts` | Modified | Production guard, `SEED_CONFIRMATION` gate, demo passwords removed |
| `tests/security-ci-config.test.ts` | Created | 14 tests |
| `tests/security-rate-limit-foundation.test.ts` | Created | 20 tests |
| `tests/security-oauth-rate-limits.test.ts` | Created | 12 tests |
| `tests/security-pkce-s256.test.ts` | Created | 25 tests |
| `tests/security-auth-code-concurrency.test.ts` | Created | 7 tests |
| `tests/security-config-otp-seed-signup.test.ts` | Created | 32 tests |
| Living documentation | Updated | `README.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`, `docs/api/openapi.yaml` |

## Architecture and Security Decisions

| Decision | Why |
|----------|-----|
| Fail-closed rate limiter | A misconfigured production deploy with no Upstash credentials fails loudly at startup rather than silently falling back to per-process memory limits that are ineffective across serverless instances. |
| S256-only PKCE, no defaulting | `plain` provides no real security benefit over omitting PKCE entirely. Removing it eliminates the downgrade path rather than just discouraging it. Mandatory enforcement applies to every client, including confidential clients. |
| Atomic code consumption via `updateMany` | A single conditional write (`WHERE usedAt IS NULL AND expiresAt > NOW()`) claims the code and returns a row count. Tokens issue only when exactly one row is claimed. This eliminates concurrent-redemption races without requiring serializable transactions. |
| HMAC-SHA256 OTP over bare SHA-256 | A keyed HMAC means a database dump alone is insufficient to crack outstanding OTPs — the attacker also needs the server secret. The invalidation of pre-existing codes on first deployment is intentional: users in the middle of email verification request a new code, which is a one-time inconvenience in exchange for a permanent improvement to the threat model. |
| Registration kill switch before user lookup | Blocking signup at the `SELF_SERVICE_REGISTRATION_ENABLED` gate — before any database query — ensures no user enumeration is possible through the registration path, even when signup is nominally disabled. |
| `no-store` on all token responses | RFC 6749 requires this for token responses. Adding it to error and rate-limit responses as well prevents intermediate caches from storing diagnostic information that could contain partial credential data. |

## Test Plan

- [x] 14 CI config and audit-gate tests pass
- [x] 20 distributed rate-limit foundation tests pass (fail-closed, IP extraction, policy map)
- [x] 12 OAuth token and UserInfo rate-limit tests pass
- [x] 25 PKCE S256 enforcement tests pass (mandatory challenge, plain rejection, constant-time comparison)
- [x] 7 atomic code-consumption tests pass (concurrent redemption, replay prevention)
- [x] 32 HMAC OTP, seed safety, and registration kill-switch tests pass
- [x] All 142 tests across 13 files pass
- [ ] Production golden-path verification: S256 authorize→token→UserInfo flow, code replay rejection, rate-limit 429 with `Retry-After`, `Cache-Control: no-store` on token responses, OTP resend/re-verify, signup rejection

## Validation

```bash
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level=high
pnpm audit --prod --audit-level=high
```

Results:

- `prisma:validate`: ✅
- Typecheck: ✅ 0 errors
- Lint: ✅ 0 errors
- Tests: ✅ 142/142 across 13 files
- Build: ✅ full production build, no `SKIP_ENV_VALIDATION`
- Security audit (full): ✅ 0 HIGH/CRITICAL (1 low, 9 moderate remain)
- Security audit (production): ✅ 0 HIGH/CRITICAL (2 moderate remain)

## Deployment Notes

**New required environment variables (must be set before deploy):**

| Variable | Purpose | Notes |
|----------|---------|-------|
| `OTP_HMAC_SECRET` | HMAC key for OTP storage | Minimum 32 characters; generate with `openssl rand -base64 48` |
| `SELF_SERVICE_REGISTRATION_ENABLED` | Registration kill switch | Must be `false` in production |
| `UPSTASH_REDIS_REST_URL` | Distributed rate limiter | Now required (was optional) |
| `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiter | Now required (was optional) |
| `OAUTH_JWT_PRIVATE_KEY` | OIDC signing | Now required (was optional) |
| `OAUTH_JWT_PUBLIC_KEY` | OIDC signing | Now required (was optional) |
| `AUTH_URL` / `NEXTAUTH_URL` | Issuer URL | Now required (was optional) |

**OTP invalidation:** setting `OTP_HMAC_SECRET` invalidates all outstanding verification OTPs stored before this deployment. Users in the middle of email verification must request a new code.

**PKCE change:** any relying party that currently sends `code_challenge_method=plain` or omits `code_challenge` entirely will receive an authorization error after this deploy. Verify all relying parties send `code_challenge_method=S256` before deploying.

**Rollback:** rolling back past this release would re-expose the vulnerabilities addressed here. If a regression is found in production, open or update an incident before reverting.

Migration required: no schema changes.

See `docs/DEPLOYMENT.md` for the full pre- and post-deploy checklist.

## Known Follow-Ups

- Production golden-path verification (required to close Incident P001)
- Invite/allowlist registration gate (`SELF_SERVICE_REGISTRATION_ENABLED=false` is a temporary measure)
- bcrypt cost increase (10 → 12+)
- Password-reset token hashing
- Auth.js v5 migration planning
- Observability: structured logging, Sentry, request correlation IDs
- Coverage thresholds and Playwright E2E tests
- Pairwise subject support for new OAuth clients
