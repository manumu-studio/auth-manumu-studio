# 📦 Changelog

All notable changes to this project will be documented in this file.
This format follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [1.8.4] - 2026-06-19

### Documentation

- Added LSA-style documentation methodology scaffold: `docs/ai`, `docs/api`, `docs/audits`, `docs/continuation-prompts`, `docs/decisions`, `docs/eval`, `docs/incidents`, `docs/research`, and `docs/superpowers`.
- Added incident template and registry for production, CI, build, test, and dev-workflow incidents.
- Added full engineering and adversarial security audits plus Incident P001.
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
