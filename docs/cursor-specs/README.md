# Learning Speaking App — Cursor Build Specs

## What Is This?
Everything Cursor needs to build the Learning Speaking App MVP.
Architecture by Claude (Opus). Code by Cursor.

## Setup (one time)

```bash
# 1. Create new project directory
mkdir learning-speaking-app && cd learning-speaking-app && git init

# 2. Copy these files:
#    cursorrules.md       → .cursorrules (project root)
#    SYSTEM_SPEC.md       → docs/architecture/SYSTEM_SPEC.md
#    WORKFLOW.md           → docs/WORKFLOW.md
#    packets/              → docs/build-packets/

# 3. Open in Cursor and start with PACKET-01
```

## Packet Order (MUST be sequential)

| #  | Packet    | What It Builds                                           |
|----|-----------|----------------------------------------------------------|
| 01 | scaffold  | Next.js project, TS config, Tailwind, folders, env       |
| 02 | database  | Prisma schema, migrations, client singleton               |
| 03 | auth      | OIDC client with auth.manumustudio.com, middleware        |
| 04 | app-shell | Layout, nav bar, protected routes                         |
| 05 | recording | MediaRecorder integration, start/stop, timer              |
| 06 | upload    | POST /api/sessions, R2 temp storage, session creation     |
| 07 | pipeline  | QStash webhooks, Whisper STT, Claude analysis             |
| 08 | results   | Status polling, insights display, loading/error states    |
| 09 | history   | Session list, delete, export, consent management          |
| 10 | polish    | Rate limiting, error boundary, monitoring, cleanup        |

## How To Use Each Packet

1. Open the packet file in Cursor
2. Tell Cursor: **"Read .cursorrules first, then follow this packet exactly."**
3. Let Cursor build everything listed
4. Run the **Definition of Done** checklist at the bottom
5. All pass → next packet. Something fails → bring error to Claude Code.

## Quality Gates (after EVERY packet)

```bash
npx tsc --noEmit          # Zero type errors
npm run build             # Clean build
npm run lint              # No lint violations
```

## Escalation to Claude Code

Come back when:
- Cursor produces code that doesn't match the spec
- Type errors you can't resolve
- Architecture questions not in SYSTEM_SPEC.md
- You want a review before moving to next phase
