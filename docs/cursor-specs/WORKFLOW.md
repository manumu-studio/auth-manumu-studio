# Build Cycle — Secure Workflow

## The Loop

```
SPEC (Claude Opus)
    │
    ▼
BUILD (Cursor)
    │
    ▼
VALIDATE (Quality Gates)
    │
    ├─ ✅ All pass → next packet
    │
    └─ 🔴 Failure → escalate to Claude Code
            │
            ▼
        Fix (Claude diagnoses → Cursor implements fix)
            │
            ▼
        Re-validate → continue
```

## Rules

### For Cursor
- Read `.cursorrules` at the start of every session
- Follow the current packet EXACTLY — don't anticipate future packets
- Don't install packages not listed in the packet
- Don't create files not listed in the packet
- Run quality gates after completing each packet

### For the User
- Work through packets in order (01 → 02 → ... → 10)
- Don't skip packets — each builds on the previous
- When Cursor gets stuck, copy the error + relevant code to Claude Code
- When moving to a new packet, tell Cursor: "We're done with packet N. Now read packet N+1."

### Quality Gates (mandatory after every packet)
```bash
npx tsc --noEmit          # Zero type errors
npm run build             # Clean build
npm run lint              # No lint violations
```

### Escalation Template
When bringing errors to Claude Code, include:
```
Packet: PACKET-XX
Error: [paste full error]
File: [which file]
What Cursor tried: [brief description]
```

## Testing Strategy
- **No unit tests in MVP** — prioritize shipping
- **Manual testing** after each packet using the Definition of Done checklist
- **Integration testing** after packet 08 (full flow: record → upload → results)
- **Add tests in v1.1** once the product is validated

## Environment Setup Order
1. Create `.env.local` with all variables from SYSTEM_SPEC.md
2. Set up Neon Postgres database
3. Register OAuth client on auth.manumustudio.com
4. Set up Upstash QStash account
5. Set up Cloudflare R2 bucket (or S3)
6. Get OpenAI API key (Whisper)
7. Get Anthropic API key (Claude Haiku for analysis)
