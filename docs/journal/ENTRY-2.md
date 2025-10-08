# M2 Next Auth + Prisma Starter

Production-ready auth starter using Next.js App Router, NextAuth, Prisma, and Chakra.

## Features
•⁠  ⁠*No flicker*: SSR session hydration (⁠ getServerSession ⁠ → ⁠ SessionProvider ⁠)
•⁠  ⁠*Feature-based* architecture (⁠ src/features/auth/* ⁠)
•⁠  ⁠Credentials auth (sign in/out, sign up) with Zod validation
•⁠  ⁠Prisma/Postgres user store
•⁠  ⁠Clean UI with Chakra components

## Getting Started
```bash
pnpm i
pnpm prisma:generate
pnpm prisma:migrate
pnpm db:seed
pnpm dev


# ENTRY 2 — Auth UX polish & feature-based refactor

## What we did
•⁠  ⁠Migrated to a feature-based architecture:
  - ⁠ src/features/auth/{components,server,lib,types} ⁠
  - App Router groups: ⁠ (public) ⁠, ⁠ (auth) ⁠, ⁠ (dashboard) ⁠
•⁠  ⁠Eliminated UI flicker (FOUC of unauthenticated state)
  - SSR ⁠ getServerSession(authOptions) ⁠ in ⁠ src/app/layout.tsx ⁠
  - Passed ⁠ session ⁠ into ⁠ Providers ⁠ → ⁠ SessionProvider ⁠
•⁠  ⁠Implemented credential sign in & sign up
  - Clean form validation with Zod
  - Session persists and logout works predictably
•⁠  ⁠Created clear component boundaries:
  - ⁠ AuthModal ⁠, ⁠ AuthLayout ⁠, ⁠ SignInForm ⁠, ⁠ SignupForm ⁠, ⁠ UserCard ⁠, ⁠ SessionBadge ⁠
•⁠  ⁠Added docs per folder to guide future contributors

## Why it matters
•⁠  ⁠Senior-grade structure: predictable slices, easier scaling
•⁠  ⁠Faster first paint with no auth UI jump
•⁠  ⁠Clean import aliases (⁠ @/* ⁠), easy to navigate code

## What’s next (prioritized)
1) Email verification (token create/consume + resend + banner)
2) OAuth (Google → Apple → Facebook)
3) “Auto-login after verified” to remove first-run friction

## Known non-blockers
•⁠  ⁠A few helpers parked in ⁠ _incubator/ ⁠ (for later use)
•⁠  ⁠Dashboard route group is a placeholder (will be used post-verify)