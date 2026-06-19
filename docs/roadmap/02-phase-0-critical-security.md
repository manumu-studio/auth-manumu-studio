# Phase 0 — Critical Security

**Status:** Next
**Branch:** `fix/security-hardening-now`
**Incident:** `INCIDENT-P001`

## Goal

Remove immediate production-facing security exposure without changing the
subject-identifier contract used by existing relying parties.

## Scope

- Patch Next.js and vulnerable dependencies.
- Add high/critical dependency and secret-scanning CI gates.
- Require Upstash in production and trust platform-owned IP headers.
- Rate-limit `/oauth/token` and `/oauth/userinfo`.
- Return non-cacheable token responses.
- Require PKCE S256.
- Consume authorization codes atomically.
- HMAC OTP hashes.
- Remove production environment-validation bypasses.
- Remove known seed credentials.

## Completion Gates

- Relevant unit/integration regression tests.
- `pnpm typecheck`
- read-only lint gate
- `pnpm test`
- `pnpm build`
- dependency audit
- secret scan
- Incident P001 resolution section updated after deployment verification.
- README, CHANGELOG, architecture, security, API, deployment, testing, journal,
  PR documentation, and version synchronized.
