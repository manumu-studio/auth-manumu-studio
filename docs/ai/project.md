# Project Context

## Identity

ManuMu Studio Authentication is the shared authentication and OAuth/OIDC
provider for ManuMu Studio projects. It started as a NextAuth starter and now
acts as a first-party identity service for apps such as Learning Speaking App,
Career Kit, FixtureLog, and Petsgram-compatible clients.

## Current Shape

- Next.js 15 App Router application.
- NextAuth v4 with Prisma adapter and JWT sessions.
- PostgreSQL schema managed by Prisma migrations.
- Credentials, Google, and GitHub sign-in.
- OTP email verification and password reset.
- OAuth client registry, authorization code endpoint, token endpoint, JWKS,
  OIDC discovery, userinfo, and federated logout.
- Dashboard/account management for profile, password, provider disconnect, and
  account deletion.

## Packet Boundaries

Prefer small packets that map to one behavior or one quality concern:

- Auth flow packet: credentials, signup, verify, reset, callback threading.
- OAuth server packet: client registry, authorize, token, userinfo, logout.
- Account packet: dashboard/profile/settings/onboarding.
- Security packet: rate limiting, token hardening, session invalidation.
- Documentation packet: README, CHANGELOG, architecture, journal, PR docs.
- Test packet: unit, integration, E2E, or CI gate expansion.

Every packet should end with living-doc synchronization.

