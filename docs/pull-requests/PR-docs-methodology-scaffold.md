# PR-1.8.4 - Documentation and Security Baseline

**Branch:** `docs/security-baseline` → `main`
**Version:** `1.8.4`
**Date:** 2026-06-19
**Status:** Ready for validation

---

## Summary

Adds the applicable LSA documentation methodology and synchronizes every
current-state document needed before the security-hardening branch starts.

## Files Changed

| Area | Notes |
|------|-------|
| `docs/ai/` | Project context, TypeScript rules, packet workflow |
| `docs/api/` | API documentation home and OpenAPI placeholder |
| `docs/audits/` | Audit report home |
| `docs/continuation-prompts/` | Continuation prompt home and archive |
| `docs/decisions/` | ADR home and template |
| `docs/eval/` | Evaluation artifact home |
| `docs/incidents/` | Incident template and registry |
| `docs/research/` | Research artifact home |
| `docs/superpowers/` | Plan/spec artifact home |
| `README.md` | Current capabilities, limitations, setup, and execution order |
| `.env.example` | Exact runtime schema keys; unsupported providers removed |
| `PROJECT_MAP.md` | Current routes, domains, persistence, and active security work |
| `docs/ARCHITECTURE.md` | Rewritten from live code and Prisma evidence |
| `docs/SECURITY.md` | Controls and active risks separated explicitly |
| `docs/api/openapi.yaml` | Stable OTP and OAuth/OIDC endpoint contract |
| `docs/roadmap/` | Current security-to-SDK sequence |
| `CONTRIBUTING.md` | LSA-aligned workflow |
| `docs/DEPLOYMENT.md` | Deployment and production verification |
| `docs/TESTING.md` | Current test baseline and target gates |
| Feature READMEs | Stale and empty docs reconciled |
| `package.json` | Version bumped to 1.8.4 |
| `docs/README.md` | Documentation map |
| `CHANGELOG.md` | 1.8.4 entry |
| `docs/journal/ENTRY-22.md` | Developer-facing rationale |

## Architecture Decisions

- Historical audits, journal entries, and merged PR records are immutable.
- Living docs are generated from current code, not from earlier claims.
- LSA's quality system is adopted; LSA's speech/AI product architecture is not.
- Security gaps remain visible until their implementation packets deploy.

## Testing

- [x] `git diff --check`
- [x] `pnpm typecheck`
- [x] `pnpm exec eslint . --ext .ts,.tsx`
- [x] `pnpm test` — 7 files, 32 tests passed
- [x] `pnpm build`
- [x] OpenAPI YAML parsing
- [x] link/path verification
- [x] environment-schema versus `.env.example` comparison

Build warnings:

- Browserslist data is stale.
- Next.js ESLint plugin detection is missing from the current ESLint config.

## Deployment Notes

- Package metadata version changes to 1.8.4.
- No migration required.
- No production behavior changes.
- Security hardening remains the next branch.
