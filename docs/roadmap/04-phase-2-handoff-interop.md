# Phase 2 — LSA Engineering Baseline

**Status:** Planned after gated registration

## Goal

Adopt LSA's engineering standards where they apply to a central IdP.

## Scope

- All eight TypeScript strictness flags.
- Zod at every external data boundary.
- No unsafe assertions or non-null assertions.
- ESLint core-web-vitals, TypeScript, and complexity gates.
- pnpm-only dependency installation.
- Parallel CI jobs for lint/typecheck, audit/secret scan, coverage, build,
  bundle budget, smoke, and Playwright.
- Structured Pino logging, request IDs, Sentry, health/readiness endpoints.
- Coverage thresholds and OAuth/OTP/account E2E golden paths.
- Accessibility checks and skip navigation.

Testing is mandatory for production behavior changes. It is not an optional
recommendation.
