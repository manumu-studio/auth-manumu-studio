# PR 0.4.0 — Google OAuth + Multi-Provider Sign-In Hub

## Summary
This PR adds Google OAuth and a modern sign-in hub UX (email-first flow + Google button) on the public page.

## Changes
- Server
  - `googleProvider()` factory with conditional load
  - NextAuth `options.ts` integrates Google provider (JWT strategy preserved)
- UI
  - `AuthProvidersGroup` (email-first with animated collapse)
  - Google dark button + centered label
  - Public page wired to hub, "Create Account" opens signup modal
- Docs
  - `ENTRY-4.md` (journal)
  - README updated (envs & structure)

## ENV
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Optional: `APP_URL`

## Test Plan
- Local:
  - Set env in `.env.local`
  - Start dev server: `pnpm dev`
  - Click "Log In With Google" → completes OAuth → user + account created
  - Email credentials login with unverified user → blocked (EMAIL_NOT_VERIFIED)
  - After verifying, credentials login succeeds
- Production:
  - Separate Google OAuth client with prod callback URL
  - Verify account linking works for same email

## Screenshots
- Public landing with hub (email-first + Google)
- OAuth modal + successful sign-in

## Notes
- `allowDangerousEmailAccountLinking` is set on the Google provider only (not top-level)
- No breaking changes for existing email verification flow

