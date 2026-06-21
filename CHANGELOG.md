# 📦 Changelog

All notable changes to this project will be documented in this file.
This format follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [1.9.0] - 2026-06-21

### Added

- **Packet 02 gated-registration database foundation**: added additive Prisma schema and reversible migration support for account status, credential modality, invite lifecycle, outbox delivery state with worker lease/fencing and retry fields, immutable audit events, explicit account-link intents, opaque registration sessions, and admin MFA factor state.
- **Invite lifecycle service foundation**: added server-only invite issuance, generic lookup, conditional redemption, reuse audit/alert, and idempotent revocation helpers for Packet 02.
- **Transactional email outbox worker**: added the internal outbox worker route, QStash-safe message/dedup helpers, `FOR UPDATE SKIP LOCKED` claim flow, claim-token fencing, retry/terminal failure transitions, encrypted invite-token delivery, key-version decrypt support, and fragment-only invite URL emission.
- **Packet 02 admission foundation**: added fail-closed production env requirements, Turnstile siteverify validation, shared CSRF/enumeration-parity helpers, six-surface rate-limit wiring, and reset/OTP admission integrations.
- **Gated-registration invariant coverage**: added schema, invite lifecycle, outbox, admission, and social-JIT suites, bringing the suite to **203 tests across 18 files**.

### Security

- **Social JIT and silent-linking closure**: removed Auth.js dangerous email account linking from Google/GitHub providers, added a social `signIn` gate that allows only existing linked `ACTIVE` users, added adapter-level `createUser`/`linkAccount` fail-closed backstops, and records redacted social-denial telemetry.

### Changed

- **Documentation baseline**: synchronized README, architecture, security, deployment, testing, changelog, journal, PR docs, and task reports with the Packet 02 schema, invite lifecycle, outbox worker, admission-control foundation, and social-JIT closure while keeping the user-facing invite gate and explicit social linking marked as unfinished runtime work.
- **Outbox schema contract repair**: aligned the TASK-016 `OutboxEmail` schema with TASK-018's read-only dependency by adding lease/fencing, retry, terminal failure, and `inviteCiphertext` fields before worker implementation.

---

## [1.8.5] - 2026-06-20

### Security

- **Dependencies and CI audit gate**: upgraded `next`/`eslint-config-next` to `^15.5.19` and `next-auth` to `^4.24.12`; upgraded Vitest toolchain from v2 to `^4.1.9` with `vite ^6.4.3`; removed the stale `package-lock.json`; added a blocking `security-audit` CI job (`pnpm audit --audit-level=high` full-tree and production, no `continue-on-error`) and a full-history gitleaks secret scan; converted CI build to frozen pnpm install. Result: zero HIGH/CRITICAL advisories in both audits (1 low, 9 moderate remain across the full tree; 2 moderate remain in production dependencies).

- **Distributed rate limiting (fail-closed)**: production now requires Upstash Redis — the app refuses to start without it. The in-memory fallback is restricted to development and test. Client IP is derived from Vercel-injected headers and validated with `node:net` `isIP`. Seven independent per-surface rate-limit policies replace the previous single generic limiter.

- **OAuth endpoint hardening**: `/oauth/token` enforces independent per-IP and per-client-id rate-limit buckets (before body parsing and after). `/oauth/userinfo` enforces independent per-IP and per-token-fingerprint buckets. Token request bodies are Zod-validated; Basic auth credentials are Base64-decoded before splitting on the first colon. All token responses (including errors and 429s) send `Cache-Control: no-store` + `Pragma: no-cache`. Rate-limit 429 responses carry `Retry-After` and a generic body. Client secrets and raw bearer tokens never appear in limiter keys or logs.

- **Mandatory PKCE S256**: the authorization endpoint now requires a well-formed `code_challenge` with `code_challenge_method=S256`. The `plain` method is rejected everywhere. Token exchange rejects codes stored without a challenge, non-S256 methods, and missing, malformed, or mismatched verifiers — enforced even for confidential clients. Challenge comparisons are constant-time. Discovery advertises `code_challenge_methods_supported: ["S256"]`.

- **Atomic authorization-code consumption**: codes are claimed with a single conditional `updateMany` (`WHERE usedAt IS NULL AND expiresAt > NOW()`). Tokens are issued only when exactly one row is claimed, eliminating the read-then-write replay race.

- **HMAC OTP storage**: verification OTPs are stored as `HMAC-SHA256(code, OTP_HMAC_SECRET)` instead of bare SHA-256, so a database leak alone cannot crack codes. Outstanding pre-existing codes are invalidated on first deployment; users must request a new code.

- **Environment enforcement**: production env validation now requires `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL`, `OAUTH_JWT_PRIVATE_KEY`, `OAUTH_JWT_PUBLIC_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `OTP_HMAC_SECRET`, and `SELF_SERVICE_REGISTRATION_ENABLED=false`. `SKIP_ENV_VALIDATION` removed from `vercel.json` and all CI build jobs; CI generates an ephemeral RSA keypair and supplies safe non-production values.

- **Registration kill switch and safe seed**: self-service signup (first-party and OAuth) returns a generic "registration unavailable" response in production before any user lookup, gated by `SELF_SERVICE_REGISTRATION_ENABLED=false`. The database seed refuses to run in production, without `SEED_CONFIRMATION=DEVELOPMENT_ONLY`, or with weak/missing secrets. Hardcoded demo passwords and credential logging removed.

### Testing

- Added 6 new security test suites (110 new tests): `security-ci-config` (14), `security-rate-limit-foundation` (20), `security-oauth-rate-limits` (12), `security-pkce-s256` (25), `security-auth-code-concurrency` (7), `security-config-otp-seed-signup` (32). Total suite: **142 tests across 13 files**, all passing.

---

## [1.8.4] - 2026-06-19

### Documentation

- Added LSA-style documentation methodology scaffold: `docs/ai`, `docs/api`, `docs/audits`, `docs/continuation-prompts`, `docs/decisions`, `docs/eval`, `docs/incidents`, `docs/research`, and `docs/superpowers`.
- Added incident template and registry for production, CI, build, test, and dev-workflow incidents.
- Added full engineering and adversarial security audits plus Incident P001.
- Expanded public documentation for API contracts, architecture, security,
  deployment, testing, contribution guidance, and project decisions.
- Synchronized README, architecture, security, environment, API, roadmap, and
  project-map documentation with the current codebase.
- Added `CONTRIBUTING.md`, `docs/DEPLOYMENT.md`, and `docs/TESTING.md`.
- Updated feature-level READMEs that were empty or described unimplemented
  future behavior.

### Maintenance

- Synchronized the package version to `1.8.4`.
- Documented the security-hardening and gated-registration execution order.
- Preserved historical audits, journal entries, and merged PR documents.

> Releases between 0.2.0 and 1.8.3 are indexed in
> `docs/DEVELOPMENT_JOURNAL.md`; changelog backfill is separate historical
> documentation work.

---

## [v0.2.0] - 2025-10-08
### ✨ Features
- **auth, app:** SSR-hydrated sessions for instant state recognition
- **UI:** Removed unauthenticated flicker (SSR session hydration)
- **auth-modal:** Unified “sign in / sign up” layout
- **server-actions:** Unified `ActionResult` contract with Zod validation
- **architecture:** Migrated to feature-based folder structure (`src/features/auth/*`)

### 🧠 Developer Experience
- Added 20 README files for full documentation coverage
- Added `docs/pull-requests/PR-0.2.0.md` deep dive reference
- Updated `.env.example` and validation via `lib/env.ts`
- Lint, typecheck, and build all pass (0 errors)

### 🧪 Testing
- **Done** Sign-in and sign-up flows validated
- **Done** SSR hydration confirmed (no flicker)
- **Done** Session persistence across reloads
- **Done** Logout clears session consistently

### 📚 Docs
- Full PR write-up: [`docs/pull-requests/PR-0.2.0.md`](docs/pull-requests/PR-0.2.0.md)

---

## [v0.1.0] - 2025-10-03
Initial setup:
- Credentials-based auth (NextAuth + Prisma)
- Zod validation schemas
- Chakra UI + ESLint/Prettier setup
- Seed data for test users
