# Learning Speaking App — Cursor Rules
# Copy this file as `.cursorrules` to the new project root

## Project Identity
- **Name**: Learning Speaking App (LSA)
- **Purpose**: Web tool for English learners (B2–C1+) to practice speaking and get pattern-based feedback
- **Type**: Website (desktop-first, responsive — NOT mobile app, NOT PWA)
- **Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, Neon Postgres
- **Auth**: External OIDC provider at auth.manumustudio.com — we do NOT build auth here

## References
- Full architecture: `docs/architecture/SYSTEM_SPEC.md` (always check before making decisions)
- Current task: `docs/build-packets/PACKET-XX.md`

## TypeScript Standards (strict — no exceptions)
- `strict: true` in tsconfig — all strict flags enabled
- **No `any`** — use `unknown` + type guards when truly needed
- **No non-null assertions** (`!`) — use explicit `| null` typing
- **Union types** over enums: `'grammar' | 'vocabulary' | 'structure'`
- **`satisfies`** operator for type-safe object literals with inference
- **Discriminated unions** for state machines (e.g., session status)
- Named exports only (except Next.js page/layout/route which require default exports)

## File Standards
- Every code file starts with a **one-line comment** describing what it does
- Section comments for main logic blocks — minimal, purposeful
- No excessive JSDoc — keep lean

## Component Structure (4-file pattern — mandatory)
```
ComponentName/
├── ComponentName.tsx        # React component ('use client' when needed)
├── ComponentName.types.ts   # All interfaces/types exported here
├── index.ts                 # Barrel export
└── useComponentName.ts      # Custom hook (only when component needs one)
```
- Props always defined in `.types.ts` as exported interfaces
- No inline type definitions in component files
- `'use client'` only on components using browser APIs or React hooks

## Project Structure
```
src/
├── app/
│   ├── (app)/                    # Authenticated pages
│   │   ├── layout.tsx
│   │   ├── session/
│   │   │   ├── new/page.tsx      # Recording page
│   │   │   └── [id]/page.tsx     # Results page
│   │   └── history/page.tsx      # Past sessions
│   ├── (public)/
│   │   └── page.tsx              # Landing page
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── sessions/             # Session CRUD
│       ├── profile/              # User profile + consent
│       └── internal/             # QStash webhooks (not user-facing)
├── components/ui/                # Shared UI components (4-file pattern)
├── features/
│   ├── auth/                     # OIDC client config
│   ├── recording/                # Audio recording logic + components
│   ├── session/                  # Session domain logic
│   └── insights/                 # Feedback display logic
├── lib/
│   ├── ai/                       # Claude + Whisper clients
│   ├── queue/                    # QStash integration
│   ├── storage/                  # R2 temp storage client
│   ├── env.ts                    # Zod environment validation
│   ├── prisma.ts                 # Prisma client singleton
│   └── utils.ts                  # Tiny shared utilities (max 50 lines)
└── prisma/
    └── schema.prisma
```

## Hard Rules
1. **Never install packages** not specified in the current build packet
2. **Never modify files** outside the scope of the current packet
3. **4-file component pattern** — no exceptions, even for small components
4. **All API routes validate auth** — check session before any DB operation
5. **No `console.log`** in production code — use structured logging or remove
6. **Environment variables** — always via Zod-validated `env` object from `lib/env.ts`
7. **HTTP errors** — return `{ error: string, code?: string }` JSON with proper status codes
8. **Prisma queries** — always scope to `userId` (prevent data leakage between users)
9. **No default exports** except where Next.js requires (page, layout, route)
10. **Imports** — use `@/` path alias for all imports from `src/`

## Quality Gates (after every packet)
```bash
npx tsc --noEmit          # Zero type errors
npm run build             # Clean build
npm run lint              # No lint violations
```
All three MUST pass before moving to the next packet.
