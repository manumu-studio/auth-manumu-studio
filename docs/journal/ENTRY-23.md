# ENTRY-23 - Security Hardening and OAuth Controls

**Date:** 2026-06-20
**Type:** Security Release
**Branch:** `feat/security-hardening`
**Version:** `1.8.5`
**PR:** `docs/pull-requests/PR-1.8.5.md`

---

## What I Did

Implemented eight security hardening themes on the OIDC authorization server: upgraded dependencies and added blocking CI audit gates; rearchitected rate limiting to be fail-closed and distributed via Upstash Redis with a 7-policy surface map; hardened the OAuth token and UserInfo endpoints with independent rate-limit buckets, Zod-validated bodies, and mandatory no-store cache headers; made PKCE S256 mandatory everywhere and rejected plain; made authorization-code consumption atomic via a single conditional update; switched OTP storage from bare SHA-256 to HMAC-SHA256 keyed with a server secret; enforced all required production environment variables in the schema (removing SKIP_ENV_VALIDATION); and added a registration kill switch plus a safe database seed. Added 110 new security tests across 6 suites, bringing the total to 142 tests across 13 files.

## Files Touched

| File / Folder | Action | Notes |
|---------------|--------|-------|
| `package.json` | Modified | Version 1.8.5; next/next-auth/vitest/vite upgrades; package-lock.json removed |
| `pnpm-lock.yaml` | Modified | Updated after dependency upgrades |
| `.github/workflows/` | Modified | Blocking security-audit CI job, gitleaks full-history scan, frozen pnpm install |
| `vercel.json` | Modified | SKIP_ENV_VALIDATION removed |
| `src/lib/env.ts` | Modified | Upstash, OTP_HMAC_SECRET, SELF_SERVICE_REGISTRATION_ENABLED now required in production |
| `src/lib/rateLimit.ts` | Rearchitected | Fail-closed distributed limiter; 7-policy map; Vercel IP-header trust strategy |
| `src/app/oauth/token/route.ts` | Modified | Zod-validated body, per-IP + per-client-id rate limits, no-store headers on all responses |
| `src/app/oauth/userinfo/route.ts` | Modified | Per-IP + per-token-fingerprint rate limits |
| `src/features/auth/server/oauth/authorizeRequest.ts` | Modified | S256 required; plain rejected; missing challenge rejected |
| `src/features/auth/server/oauth/token.ts` | Modified | Atomic code consumption via conditional updateMany; constant-time challenge comparison |
| `src/features/auth/server/oauth/pkce.ts` | Created | PKCE validation, S256 computation, and constant-time comparison helpers |
| `src/features/auth/server/oauth/rateLimitKeys.ts` | Created | Non-sensitive OAuth limiter-key builders |
| `src/features/auth/server/oauth/tokenRequestSchema.ts` | Created | Zod validation for JSON and form token requests |
| `src/app/.well-known/openid-configuration/route.ts` | Modified | Discovery advertises S256 only |
| `src/features/auth/server/verify/createToken.ts` | Modified | HMAC-SHA256 OTP storage |
| `src/features/auth/server/actions/signup.ts` | Modified | Registration kill switch |
| `prisma/seed.ts` | Modified | Production guard, SEED_CONFIRMATION gate, demo passwords removed |
| `tests/security-ci-config.test.ts` | Created | 14 tests — CI config and audit gate |
| `tests/security-rate-limit-foundation.test.ts` | Created | 20 tests — distributed limiter, fail-closed, IP extraction |
| `tests/security-oauth-rate-limits.test.ts` | Created | 12 tests — OAuth token and UserInfo limits |
| `tests/security-pkce-s256.test.ts` | Created | 25 tests — mandatory S256, plain rejection, constant-time |
| `tests/security-auth-code-concurrency.test.ts` | Created | 7 tests — atomic code consumption |
| `tests/security-config-otp-seed-signup.test.ts` | Created | 32 tests — HMAC OTP, seed safety, registration kill switch |
| `README.md` | Updated | Version 1.8.5; security controls section; environment section; removed stale "known security work" list |
| `CHANGELOG.md` | Updated | 1.8.5 entry with all 8 themes |
| `docs/ARCHITECTURE.md` | Updated | Rate-limiting section, PKCE/atomic/HMAC claims updated, Upstash mandatory |
| `docs/SECURITY.md` | Updated | Implemented controls reflect 1.8.5 state; active risks trimmed to what remains |
| `docs/DEPLOYMENT.md` | Updated | Pre/post-deploy checklists, new required vars, OTP invalidation note, rollback guidance |
| `docs/TESTING.md` | Updated | 13 files / 142 tests; 6 new security suites listed |
| `docs/api/openapi.yaml` | Updated | 429 responses, Retry-After, no-store headers, S256-only PKCE |
| `docs/journal/ENTRY-23.md` | Created | This entry |
| `docs/pull-requests/PR-1.8.5.md` | Created | PR documentation |

## Decisions

- **Fail-closed limiter**: chose to reject requests (throw in production) rather than silently fall back to memory. A misconfigured production deploy is safer to detect via startup failure than to silently degrade to per-process limits that don't work across serverless instances.
- **S256-only PKCE**: removed plain entirely rather than just defaulting to S256. The plain method provides no real security benefit over not having PKCE at all, and making it mandatory eliminates the downgrade surface.
- **Atomic code consumption via updateMany**: chose the single conditional write instead of a SELECT-then-UPDATE transaction. This eliminates the entire class of concurrent-redemption races without requiring serializable transactions, and the row-count check (exactly 1 row updated) is the correctness assertion.
- **HMAC OTP over bare SHA-256**: HMAC-SHA256 keyed with a server secret means a database dump alone is not sufficient to crack outstanding OTPs. The invalidation of pre-existing codes on deployment is intentional and documented — it is a one-time user inconvenience in exchange for a permanent improvement in the threat model.
- **SELF_SERVICE_REGISTRATION_ENABLED kill switch**: blocking signup before any user lookup (including email existence checks) ensures no enumeration is possible even through the kill switch path. This is a temporary measure until invite/allowlist gating is implemented.

## Validation

```bash
pnpm prisma:validate    # ✅ schema valid
pnpm typecheck          # ✅ 0 errors
pnpm lint               # ✅ 0 errors
pnpm test               # ✅ 142/142 tests, 13 files
pnpm build              # ✅ full production build, no SKIP_ENV_VALIDATION
pnpm audit --audit-level=high              # ✅ 0 HIGH/CRITICAL (1 low, 9 moderate remain)
pnpm audit --prod --audit-level=high       # ✅ 0 HIGH/CRITICAL (2 moderate remain)
```
