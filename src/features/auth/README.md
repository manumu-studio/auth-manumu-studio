# Auth Feature

Vertical slice for authentication. Everything auth-related lives here.

## Structure
- **components/** – UI pieces (AuthModal, AuthLayout, SignInForm, SignupForm, UserCard)
- **server/** – server actions, NextAuth options, queries, and future email-verify handlers
- **lib/** – client/server helpers (kept minimal; prefer NextAuth’s APIs)
- **types/** – NextAuth type augmentation (Session/User fields)

## Conventions
- Components are client/server as needed. Prefer server actions for mutations.
- Zod validation in `src/lib/validation/*`.
- Import using path alias: `@/features/auth/...`.

## Extending
- **OAuth**: add providers in `server/options.ts`.
- **Email verification**: implement `server/verify/{createTokens,consumeTokens,resend}.ts`.
- **Protected routes**: use `(dashboard)` route group + `auth()` on layouts.