# Docs

Project documentation, packet specs, reports, and working notes.

## Core References

- `ARCHITECTURE.md` - current system architecture and auth/OAuth flows.
- `SECURITY.md` - security practices and considerations.
- `DEPLOYMENT.md` - environment, deployment, verification, and rollback.
- `TESTING.md` - current test coverage and required quality gates.
- `DEVELOPMENT_PLAYBOOK.md` - broader ManuMu Studio development methodology.
- `DEVELOPMENT_JOURNAL.md` - high-level project history with journal links.

## Methodology Layout

- `ai/` - compact project, TypeScript, and packet methodology context.
- `api/` - API contracts and external integration notes.
- `architecture/` - diagrams, specs, and durable architecture notes.
- `audits/` - point-in-time audit reports.
- `build-packets/` - feature packet specs.
- `build-packet-reports/` - packet completion reports.
- `continuation-prompts/` - resumable workstream prompts.
- `cursor-tasks/` - task-level builder prompts.
- `cursor-task-reports/` - per-task completion reports.
- `decisions/` - architecture decision records.
- `eval/` - rubrics and recurring verification plans.
- `incidents/` - production, CI, build, test, and dev-workflow incidents.
- `journal/` - development journal entries.
- `language/` - English coaching corpus.
- `pull-requests/` - PR documentation.
- `research/` - research, spikes, and decision support.
- `roadmap/` - phase and milestone planning.
- `session-prompts/` - session summaries.
- `superpowers/` - Superpowers-generated plans and specs.

## Packet Documentation

Every feature packet should end with:

1. A journal entry in `docs/journal/`.
2. PR documentation in `docs/pull-requests/`.
3. A packet report in `docs/build-packet-reports/` when a formal packet was used.
4. Living-doc updates for README, CHANGELOG, architecture, and any current-state docs affected.
