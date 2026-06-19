# Deployment

**Version:** 1.8.4
**Target:** Vercel + Neon PostgreSQL

## Required Services

- Vercel project for `auth.manumustudio.com`
- Neon/PostgreSQL database
- Resend account and verified sender
- RSA key pair for OAuth/OIDC signing
- Upstash Redis for production rate limiting

## Required Environment

Core:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` or `AUTH_URL`
- `APP_URL`

OIDC:

- `OAUTH_JWT_PRIVATE_KEY`
- `OAUTH_JWT_PUBLIC_KEY`
- optional `OAUTH_JWT_KID`

Email:

- `RESEND_API_KEY`
- `RESEND_FROM`

Rate limits:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_MINUTES`

See `.env.example`.

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

Then deploy through Vercel and verify:

1. `/.well-known/openid-configuration`
2. `/jwks.json`
3. credentials sign-in
4. OTP signup/verification
5. password reset
6. OAuth authorize/token/UserInfo
7. RP-initiated logout

## Current Deployment Risks

- `vercel.json` still sets `SKIP_ENV_VALIDATION=true`.
- CI also bypasses environment validation.
- Upstash is not mandatory in production.
- The smoke script references a missing `/api/healthz` endpoint.
- The repository contains a legacy npm lockfile despite pnpm being canonical.

These are Phase 0 security-hardening tasks and block a clean production
readiness claim.

## Rollback

- Keep migrations backward-compatible whenever possible.
- Do not deploy destructive schema changes without a tested rollback or
  restoration procedure.
- For OAuth contract changes, preserve existing client behavior or version the
  change.
- If an auth regression reaches production, open/update an incident before
  attempting the fix.
