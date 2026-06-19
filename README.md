# ManuMu Studio Authentication

Central authentication and OAuth/OIDC service for ManuMu Studio applications.

**Version:** 1.8.4
**Runtime:** Next.js 15 App Router · TypeScript 5.9 · NextAuth v4 · Prisma 6 · PostgreSQL
**Production URL:** [auth.manumustudio.com](https://auth.manumustudio.com)

> Security hardening is in progress. This service has working authentication
> and OIDC flows, but it is not yet presented as attack-resistant or generally
> production-ready. See [Incident P001](docs/incidents/INCIDENT-P001-auth-security-exposure.md)
> and the [security audit](docs/audits/SECURITY-AUDIT-2026-06-17.md).

## Current Capabilities

- Credentials sign-in with bcrypt password hashing.
- Google and GitHub sign-in through NextAuth.
- Six-digit OTP email verification with resend cooldown and auto-login.
- Enumeration-resistant password-reset request flow.
- JWT sessions with user ID and role claims.
- Profile, password, connected-account, onboarding, and account-deletion UI.
- OAuth client registry with exact redirect URI and allowed-origin lists.
- Authorization Code flow with consent, PKCE support, access tokens, and ID tokens.
- OIDC discovery, JWKS, UserInfo, and RP-initiated logout.
- Prisma migrations for PostgreSQL and Neon-compatible deployment.

## Known Security Work

The following controls are planned but not yet complete:

- Close unrestricted self-service registration.
- Require distributed Upstash rate limiting in production.
- Patch vulnerable dependencies and block vulnerable builds in CI.
- Require PKCE S256 and remove `plain`.
- Consume authorization codes atomically.
- Replace bare SHA-256 OTP storage with keyed HMAC storage.
- Harden JWT claim validation, session lifecycle, and account linking.

The execution order is:

1. `PACKET-security-hardening-now`
2. `PACKET-gated-registration`
3. LSA engineering-baseline parity
4. App membership and pairwise subjects for new clients
5. Redirect-based SDK

## Architecture

```text
Relying-party application
  -> /oauth/authorize
  -> ManuMu session / credentials / social provider
  -> authorization code
  -> /oauth/token
  -> RS256 access token + optional ID token
  -> JWKS / UserInfo verification
```

Existing relying parties use the same public `sub` (`User.id`). Pairwise
subjects are researched for new clients but are not implemented.

See:

- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [API contract](docs/api/openapi.yaml)
- [Roadmap](docs/roadmap/ROADMAP.md)

## Project Structure

```text
src/
├── app/
│   ├── (public)/                 # Public authentication entry
│   ├── (auth)/                   # Verify, reset, onboarding
│   ├── api/auth/                 # NextAuth and OTP APIs
│   ├── dashboard/                # Protected account management
│   ├── oauth/                    # Authorize, token, UserInfo, logout
│   ├── .well-known/              # OIDC discovery
│   └── jwks.json/                # Public signing keys
├── components/ui/                # Shared UI components
├── features/
│   ├── account/                  # Profile and account settings
│   └── auth/                     # Auth UI, actions, OAuth/OIDC internals
└── lib/                          # Env, Prisma, rate limits, validation

prisma/
├── schema.prisma
└── migrations/

docs/
├── ai/                           # Project methodology context
├── api/                          # API contracts
├── audits/                       # Point-in-time audit reports
├── incidents/                    # Active/resolved incidents
├── research/                     # Research artifacts
├── roadmap/                      # Current execution plan
├── journal/                      # Historical feature entries
└── pull-requests/                # Historical PR records
```

## Local Setup

Prerequisites:

- Node.js 20 or newer
- pnpm 9.12.3
- PostgreSQL

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

Use pnpm only. `package-lock.json` is a legacy lockfile scheduled for removal
in the security-hardening dependency task.

## Environment

Required for the core application:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` or `AUTH_URL`

Required for OAuth/OIDC token issuance:

- `OAUTH_JWT_PRIVATE_KEY`
- `OAUTH_JWT_PUBLIC_KEY`
- optional `OAUTH_JWT_KID`

Required for production email delivery:

- `RESEND_API_KEY`
- `RESEND_FROM`

Production rate limiting currently supports Upstash, but the variables are
still optional until the security-hardening packet lands:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

See [.env.example](.env.example) and [Deployment](docs/DEPLOYMENT.md).

## Commands

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:deploy
```

Current limitations:

- `pnpm lint` runs ESLint with `--fix`; CI should become read-only.
- Coverage thresholds and Playwright E2E tests are not configured.
- The `smoke` script targets `/api/healthz`, which will be implemented during
  the LSA parity work.

See [Testing](docs/TESTING.md) and [Contributing](CONTRIBUTING.md).

## Documentation Policy

Living documents describe the current codebase and must be synchronized in
every feature branch:

- `README.md`
- `CHANGELOG.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/api/openapi.yaml`
- `docs/roadmap/`
- relevant feature READMEs

Audits, incidents, journal entries, and merged PR documents are point-in-time
records and are not rewritten to make historical claims match current code.
