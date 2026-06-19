# Security

**Version:** 1.8.4
**Last Updated:** 2026-06-19
**Current Status:** Incident P001 is active; hardening is not complete.

## Security Posture

The service has working security controls, but it must not currently be
described as attack-proof or fully production-hardened.

Authoritative point-in-time records:

- [Security audit](audits/SECURITY-AUDIT-2026-06-17.md)
- [Full engineering audit](audits/AUDIT-V1-AUTH-MANUMU-STUDIO.md)
- [Incident P001](incidents/INCIDENT-P001-auth-security-exposure.md)

## Implemented Controls

### Credentials

- Zod validation for credentials, signup, OTP, reset, and account actions.
- Normalized lowercase emails.
- bcrypt password hashing with cost factor 10.
- Credentials login requires `emailVerified`.
- PETSGRAM-origin accounts cannot use first-party credentials login.
- Generic duplicate-signup and password-reset responses reduce enumeration.

### Sessions

- NextAuth JWT session strategy.
- `NEXTAUTH_SECRET` requires at least 32 characters.
- Session cookies are HTTP-only and secure in production.
- OTP verification can create a session without another password submission.

### Email Verification

- Six-digit OTPs generated with `crypto.randomInt`.
- Configurable 10-minute default TTL and two-minute resend cooldown.
- Maximum five failed attempts per active token.
- Successful verification updates the user and deletes tokens transactionally.

### Password Reset

- Cryptographically random 256-bit reset tokens.
- Enumeration-resistant reset requests.
- Rate limits on request and token-consumption actions.
- Password update, token deletion, and database-session deletion occur in one
  transaction.

### OAuth/OIDC

- Exact registered redirect URI matching.
- HTTPS required outside localhost.
- Fragments rejected from redirect URIs.
- Scope validation against global and client allowlists.
- Client secrets stored as SHA-256 hashes and compared timing-safely.
- Authorization codes are random, short-lived, client-bound, redirect-bound,
  scope-bound, and optionally PKCE/nonce-bound.
- RS256 access and ID tokens.
- Public-key-only JWKS endpoint.
- Signed `id_token_hint` verification for logout.
- Allowlisted post-logout redirects.

### HTTP and Data Layer

- CSP with `frame-ancestors 'none'`.
- HSTS in production.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- Strict-origin Referrer Policy.
- Prisma parameterized queries; no application raw SQL found.
- Environment files are ignored by Git.

## Active Risks

### Release-Blocking

1. **Open registration:** any valid email can create an account.
2. **Production rate-limit fallback:** missing Upstash credentials silently
   enable a process-local limiter.
3. **Dependency exposure:** the current dependency baseline includes recorded
   high/critical advisories and no blocking audit gate.

### High Priority

- `/oauth/token` and `/oauth/userinfo` are not rate-limited.
- `X-Forwarded-For` is trusted before platform-owned IP headers.
- PKCE `plain` is accepted and S256 is not mandatory.
- Authorization-code consumption is not atomic.
- OTPs use bare SHA-256, which is crackable after a database leak.
- bcrypt cost 10 is below the intended hardening target.
- Seed data contains known demo passwords and prints secrets.
- Vercel/CI builds bypass environment validation.
- Social providers use `allowDangerousEmailAccountLinking`.
- Password-reset tokens are stored directly.
- JWT decoding does not fully validate header algorithm, issuer, audience, and
  runtime payload shape on every verification path.

### Operational Gaps

- No structured application logger.
- No Sentry/error-tracking integration.
- No request correlation IDs or alerting.
- No secret-scanning CI job.
- No coverage, E2E, or bundle-size release gates.
- No health endpoint despite the existing smoke-script reference.

## Control Matrix

| Area | Current | Required Next State |
|------|---------|---------------------|
| Registration | Public signup | Invite/allowlist/admin gate + bot defense |
| Rate limits | Upstash or local Map | Upstash mandatory in production |
| PKCE | Optional, `plain` or S256 | S256 required |
| Auth code use | Read then update | Atomic conditional update |
| OTP storage | SHA-256 | HMAC-SHA256 with server secret |
| Password hashing | bcrypt 10 | bcrypt 12+ and migration strategy |
| Dependencies | Manual | High/critical audit gate |
| Secrets | No CI scan | Full-history gitleaks |
| Observability | Console logs | Pino + request IDs + Sentry |
| Testing | Seven Vitest files | Coverage thresholds + Playwright |

## Account Linking

Google and GitHub currently set:

```text
allowDangerousEmailAccountLinking: true
```

This improves user experience but creates risk if provider email-verification
semantics, provider trust, or account ownership assumptions change. It is not
documented as “no account takeover risk.” The setting requires a dedicated
review and explicit provider policy before broader use.

## Subjects and Privacy

The OIDC subject is currently `User.id` for all clients. It is stable, but it
allows relying parties to correlate the same user.

Planned policy:

- existing LSA, Career Kit, and FixtureLog integrations retain public subjects;
- new clients default to pairwise subjects;
- credentials remain central and are never duplicated per app;
- per-app access is modeled with membership records.

Email remains a separate correlation vector whenever the `email` scope is
granted.

## Rate-Limited Paths

Currently rate-limited:

- credentials sign-in;
- signup;
- OTP verification;
- OTP resend;
- password-reset request;
- password-reset consumption;
- account mutation actions.

Not currently rate-limited:

- OAuth token exchange;
- UserInfo;
- logout.

The generic limiter uses IP plus email where available. Some flows also need
independent per-IP and per-email caps to resist distributed abuse.

## Environment and Secrets

The runtime schema is `src/lib/env.ts`; `.env.example` mirrors its keys.

Production-critical values:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` or `AUTH_URL`
- `OAUTH_JWT_PRIVATE_KEY`
- `OAUTH_JWT_PUBLIC_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The OAuth key variables and Upstash variables are still optional in the schema.
The hardening packet will enforce production requirements.

Never store or log:

- plaintext passwords;
- OTP codes in production;
- reset tokens;
- authorization codes;
- access/ID tokens;
- OAuth client secrets;
- private signing keys.

## Incident and Release Process

Security regressions, test regressions, build failures, and production auth
exposure require an incident file before fixes begin.

Incident P001 closes only after:

1. security-hardening changes are merged;
2. gated registration is merged;
3. CI passes;
4. production deployment succeeds;
5. credentials, OTP, OAuth, UserInfo, and logout golden paths are verified.

## Reporting a Vulnerability

Do not open a public issue containing exploit details or secrets. Contact the
repository owner privately with:

- affected endpoint or flow;
- reproduction steps;
- expected and actual behavior;
- impact assessment;
- suggested mitigation when available.
