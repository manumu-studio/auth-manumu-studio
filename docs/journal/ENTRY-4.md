# ENTRY-4 — Google OAuth + Multi-Provider Sign-In Hub

**Date:** October 11, 2025

## What we built
- Added Google OAuth provider via NextAuth v4 with PrismaAdapter.
- Implemented a "multi-provider sign-in hub" on the public landing page:
  - Email-first flow: expands credentials form on demand
  - One-click Google sign-in
  - "Create Account" link opens signup modal
- Preserved security:
  - Credentials require verified email (throws EMAIL_NOT_VERIFIED)
  - OAuth users are allowed immediately (trust Google verification)
  - Silent account linking by email enabled

## Files touched (high level)
- `src/features/auth/server/providers/google.ts`
- `src/features/auth/server/options.ts`
- `src/features/auth/components/ProviderButtons/*`
- `src/app/(public)/page.tsx`

## ENV
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Optional: `APP_URL` (fallback for callback URL assembly)

## Risks & mitigations
- Callback URL mismatch → documented exact URIs
- Email collision linking → Prisma adapter handles linking; verified with tests
- Local vs Prod → recommend separate OAuth clients per env

## Next
- Add GitHub/Facebook providers
- Domain restriction (Google `hd`) when needed
- MFA (future)

