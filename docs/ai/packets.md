# Packet Workflow

This project follows the same feature-packet methodology as LSA, adapted for
the auth server.

## Packet Inputs

A formal packet should usually include:

- Goal and user-facing outcome.
- Branch name and version target.
- Files in scope.
- Task list in `docs/cursor-tasks/PACKET-.../` when Cursor will build.
- Acceptance criteria and validation commands.
- Documentation requirements.

## Packet Outputs

Each completed packet should produce or update:

- `docs/build-packets/PACKET-...md` - feature spec.
- `docs/cursor-tasks/PACKET-.../TASK-...md` - task prompts when delegated.
- `docs/cursor-task-reports/...` - task reports when delegated.
- `docs/build-packet-reports/PACKET-...-report.md` - packet report.
- `docs/journal/ENTRY-N.md` - development journal entry.
- `docs/pull-requests/PR-...md` - PR documentation.
- `README.md`, `CHANGELOG.md`, and architecture docs when current-state docs
  change.

## Quality Gates

Before a packet is considered complete:

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx
pnpm test
pnpm build
```

Run the smallest relevant subset while developing, then the full gates before
shipping.

