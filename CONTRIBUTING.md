# Contributing

## Engineering Baseline

This project follows the applicable engineering standards used by Learning
Speaking App (LSA), with stricter controls where a central identity provider
requires them.

## Before Changing Code

1. Read `README.md`, `PROJECT_MAP.md`, and the relevant domain README.
2. Check `CONTINUATION_REGISTRY.md` for active workstreams.
3. Read the active incident, audit, packet, and task for the concern.
4. Use one branch per concern.
5. Do not mix security fixes, client onboarding scripts, and unrelated docs.

## Code Standards

- TypeScript strict mode.
- No production `any`.
- Avoid assertions except `as const`; validate external data with Zod.
- No non-null assertions.
- File header comments on code files.
- Feature-based organization.
- React components use the four-file component pattern.
- No secrets, tokens, OTPs, passwords, or private user data in logs.

The full LSA parity flags and ESLint complexity gates are scheduled in the
engineering-baseline phase; new code should already follow them.

## Quality Gates

Current:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Target:

- read-only lint;
- dependency audit;
- secret scan;
- coverage thresholds;
- bundle budget;
- health smoke test;
- Playwright E2E.

Do not report a gate as passing unless the command was run successfully.

## Documentation

Every feature or fix ends with:

1. living-document synchronization;
2. a new journal entry;
3. a new PR document;
4. a changelog entry;
5. semantic version update;
6. packet/build report when the packet workflow was used.

Do not rewrite historical audits, journal entries, or merged PR documents.

## Git

- Git write operations require explicit user approval.
- Stage files explicitly.
- Do not use `git add .` or `git add -A`.
- Never include AI attribution or `Co-Authored-By` trailers.
- Never bypass hooks.

Commit format:

```text
type(scope): what changed and why
```
