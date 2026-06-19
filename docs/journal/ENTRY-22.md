# ENTRY-22 - Documentation and Security Baseline

**Date:** 2026-06-19
**Type:** Documentation
**Branch:** `docs/security-baseline`
**Version:** `1.8.4`
**PR:** `docs/pull-requests/PR-docs-methodology-scaffold.md`

---

## What I Did

Replicated the applicable LSA documentation methodology and reconciled living
documentation with the current authentication/OAuth codebase before security
hardening begins.

## Files Touched

| File / Folder | Action | Notes |
|---------------|--------|-------|
| `docs/ai/` | Created | Project, TypeScript, and packet methodology notes |
| `docs/api/` | Created | API contract placeholder |
| `docs/audits/` | Created | Audit report home |
| `docs/continuation-prompts/` | Created | CP prompt home with archive |
| `docs/decisions/` | Created | ADR folder and template |
| `docs/eval/` | Created | Evaluation rubric home |
| `docs/incidents/` | Created | Incident template and registry |
| `docs/research/` | Created | Research artifact home |
| `docs/superpowers/` | Created | Superpowers plans/specs home |
| `README.md` | Updated | Current capabilities, risks, structure, execution order |
| `.env.example` | Updated | Matches the runtime environment schema |
| `PROJECT_MAP.md` | Updated | Current routes, modules, models, and sources of truth |
| `docs/ARCHITECTURE.md` | Updated | Current auth, OAuth/OIDC, database, and deployment shape |
| `docs/SECURITY.md` | Updated | Implemented controls plus active Incident P001 gaps |
| `docs/api/openapi.yaml` | Updated | Current application-owned HTTP contract |
| `docs/roadmap/` | Updated | Security → gating → LSA parity → platform → SDK |
| `CONTRIBUTING.md` | Created | LSA-aligned workflow and quality rules |
| `docs/DEPLOYMENT.md` | Created | Environment, deployment, verification, rollback |
| `docs/TESTING.md` | Created | Current test state and target quality gates |
| Feature READMEs | Updated | Removed empty/stale future-state claims |
| `package.json` | Updated | Version synchronized to 1.8.4 |
| `docs/README.md` | Updated | Documentation map |
| `CHANGELOG.md` | Updated | 1.8.4 documentation-baseline release |

## Decisions

- Created lightweight project-specific anchors instead of copying LSA content
  verbatim.
- Kept historical documents unchanged.
- Added incident files now because the current project rules depend on
  `docs/incidents/_TEMPLATE.md` and `INCIDENT_REGISTRY.md`.
- Used the live source code, Prisma schema, routes, environment schema, and
  security audit as authoritative evidence.
- Documented gaps honestly instead of describing planned controls as complete.

## Validation

Documentation and metadata change:

```bash
git diff --check                         # passed
pnpm typecheck                          # passed
pnpm exec eslint . --ext .ts,.tsx      # passed, read-only
pnpm test                               # 7 files, 32 tests passed
pnpm build                              # passed
```

Build warnings remain for stale Browserslist data and missing Next.js ESLint
plugin detection. CI/build environment-validation bypass remains tracked in
Incident P001.
