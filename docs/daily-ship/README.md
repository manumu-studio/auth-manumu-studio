# Daily Ship System

## Philosophy

Ship one meaningful improvement every day. No fake commits, no padding — real engineering work that keeps `main` stable and the GitHub heatmap green.

## Rules

1. **One task per day** — small, safe, mergeable
2. **Branch per task** — `feat/...`, `fix/...`, `chore/...`, `test/...`, `docs/...`
3. **CI must pass** before merge — `pnpm tsc --noEmit && pnpm build && pnpm lint`
4. **Conventional Commits** — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
5. **Merge to main daily** — one PR per day, squash merge
6. **Log every day** — update `log.md` with date + task + branch

## What Counts as "Meaningful"

- Feature work (even small: one field, one validation rule)
- Bug fixes
- Tests (new tests, edge cases, coverage improvements)
- Refactors (extract component, simplify logic, remove duplication)
- Performance (Lighthouse, bundle, caching)
- Security (headers, rate limits, input validation)
- Accessibility (ARIA, keyboard nav, screen reader)
- Documentation (architecture, API docs, inline docs)
- DX (CI improvements, linting rules, scripts)

## What Does NOT Count

- Whitespace-only changes
- Comment-only commits with no substance
- Renaming for the sake of renaming
- Auto-generated files with no review

## Daily Workflow

```bash
# 1. Pick today's task from daily-plan.md
# 2. Create branch
git checkout -b feat/day-XX-description

# 3. Do the work (30-90 min)

# 4. Run quality gates
pnpm tsc --noEmit && pnpm lint && pnpm test

# 5. Commit (Conventional Commits)
git add <files>
git commit -m "feat: add nickname field to signup form"

# 6. Push + merge PR to main

# 7. Log it
# Update docs/daily-ship/log.md
```

## Task Sources

- **Phase 1 (Days 1-15):** Packet A, B, C feature work from continuation prompt
- **Phase 2 (Days 16-30):** Hardening — tests, a11y, performance, security, polish
- **Phase 3 (Day 31+):** New features, open-source contributions, labs experiments
