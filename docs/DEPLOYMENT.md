# Deployment

**Version:** 1.9.0
**Target:** Vercel + Neon PostgreSQL

## Required Services

- Vercel project for `auth.manumustudio.com`
- Neon/PostgreSQL database
- Resend account and verified sender
- RSA key pair for OAuth/OIDC signing
- Upstash Redis (required in production — the app refuses to boot without it)

## Required Environment Variables

### Core

- `DATABASE_URL`
- `NEXTAUTH_SECRET` (minimum 32 characters)
- `NEXTAUTH_URL` or `AUTH_URL`
- `APP_URL`

### OIDC Signing

- `OAUTH_JWT_PRIVATE_KEY` (PEM-encoded RSA private key)
- `OAUTH_JWT_PUBLIC_KEY` (PEM-encoded RSA public key)
- `OAUTH_JWT_KID` (optional)

### Email

- `RESEND_API_KEY`
- `RESEND_FROM`

### Rate Limiting (required in production)

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### OTP Security (required in production)

- `OTP_HMAC_SECRET` (minimum 32 characters; generate with `openssl rand -base64 48`)

### Registration

- `SELF_SERVICE_REGISTRATION_ENABLED` — must be `false` in production for this release

### Packet 02 Admission and Invite Controls (required in production)

- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_EXPECTED_HOSTNAME`
- `TURNSTILE_EXPECTED_ACTION`
- `INTERNAL_WORKER_AUTH_SECRET`
- `INVITE_DELIVERY_ENCRYPTION_KEY` (32-byte hex key)
- `INVITE_DELIVERY_KEY_VERSION`
- `ADMIN_MFA_SECRET_ENCRYPTION_KEYS` (JSON version-to-32-byte-hex-key map)
- `ADMIN_MFA_SECRET_KEY_VERSION` (must exist in the keyring)
- `ADMIN_ELEVATION_MAX_AGE_SECONDS` — must be `300`

### Optional / Rate-Limit Tuning

- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_MINUTES`

### Seed / Development Only

- `SEED_ADMIN_PASSWORD`
- `SEED_USER_PASSWORD`
- `SEED_OAUTH_CLIENT_SECRET`
- `SEED_CONFIRMATION` — must equal `DEVELOPMENT_ONLY` for the seed to run

### Platform (set automatically by Vercel)

- `VERCEL` — auto-injected; controls which IP-header trust strategy is active

See `.env.example` for a full annotated reference.

## Pre-Deploy Checklist

Before deploying 1.9.0 to production:

- [ ] Generate and set `OTP_HMAC_SECRET` (≥32 characters, never reuse across environments)
- [ ] Verify Upstash Redis production credentials (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
- [ ] Verify RSA signing keys (`OAUTH_JWT_PRIVATE_KEY`, `OAUTH_JWT_PUBLIC_KEY`) and correct issuer URL (`AUTH_URL`)
- [ ] Set `SELF_SERVICE_REGISTRATION_ENABLED=false` in Vercel environment
- [ ] Set Packet 02 Turnstile, internal-worker, invite-delivery, Admin-MFA keyring, and admin freshness env vars
- [ ] Rotate any previously-used seeded or shared credentials (seed passwords, OAuth client secrets)
- [ ] Confirm CI pipeline passes (lint, typecheck, tests, build, security audit) on the branch
- [ ] Confirm preview deployment is healthy

> **OTP invalidation note:** Changing `OTP_HMAC_SECRET` invalidates all outstanding verification OTPs stored before the change. Users in the middle of email verification must request a new code. Communicate this proactively if rotating the key outside of a new deployment.

## Deployment Sequence

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:deploy
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Vercel runs `pnpm prisma:generate && next build` automatically. `SKIP_ENV_VALIDATION` is no longer set; full environment validation runs on every build.

## Post-Deploy Verification Checklist

After deploying to production, verify the golden path before closing any incident:

- [ ] `/.well-known/openid-configuration` advertises `code_challenge_methods_supported: ["S256"]` (S256 only — no `plain`)
- [ ] Complete a valid S256 authorization-code flow end to end (authorize → token → UserInfo)
- [ ] Replay the authorization code and confirm it is rejected (`error: invalid_grant`)
- [ ] Submit a request to `/oauth/token` without a `code_challenge` field and confirm rejection
- [ ] Hit `/oauth/token` and `/oauth/userinfo` repeatedly and confirm 429 with `Retry-After` header
- [ ] Confirm all `/oauth/token` responses include `Cache-Control: no-store` and `Pragma: no-cache`
- [ ] Verify OTP resend and new-code flow (request a new OTP, verify the new code succeeds)
- [ ] Confirm that self-service signup returns a generic "registration unavailable" response
- [ ] Inspect application logs and confirm no secrets, tokens, or OTP codes appear

## CI Environment

CI generates an ephemeral RSA keypair at build time and supplies safe non-production values for all required variables. `SKIP_ENV_VALIDATION` is not set. The `security-audit` job runs `pnpm audit --audit-level=high` against both the full dependency tree and production dependencies only.

## Rollback

- Keep migrations backward-compatible whenever possible.
- Do not deploy destructive schema changes without a tested rollback or restoration procedure.
- For OAuth contract changes (especially PKCE requirements), verify relying-party compatibility before rolling out.
- If an auth regression reaches production, open or update an incident before attempting the fix.
- Rolling back past a `OTP_HMAC_SECRET` rotation invalidates any OTPs issued under the new secret.
