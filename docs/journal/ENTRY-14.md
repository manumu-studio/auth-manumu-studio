# Journal Entry 14

**Date:** 2026-02-15
**Type:** Feature
**Branch:** feature/dashboard
**Version:** 1.4.0

## Summary

Built a protected dashboard with full account management: profile editing, password changes, connected OAuth provider management, and account deletion with email confirmation.

## What Was Built

### Dashboard Shell
- Protected layout with session guard (redirects unauthenticated users)
- DashboardNav — fixed top navigation with user avatar, dropdown menu, and sign-out
- Dashboard home page with welcome message and quick-access cards

### Profile Management
- Server query (getUserProfile) fetches user + profile + connected providers + hasPassword flag
- ProfileForm component with InputField integration for name, country, city, address
- updateProfile server action with rate limiting and Zod validation

### Settings Hub
- SettingsCard reusable component for settings navigation
- Settings page with cards linking to password, accounts, and delete-account sub-pages

### Password Management
- ChangePasswordForm with current/new/confirm fields
- changePassword server action — bcrypt verify + hash + update
- Handles OAuth-only accounts gracefully (no password set message)

### Connected Accounts
- ConnectedAccounts component showing linked Google/GitHub providers
- disconnectProvider server action with lockout guard (must have password OR other provider)
- Visual feedback with disconnect buttons and security warnings

### Account Deletion
- DeleteAccountForm with email confirmation pattern (type email to confirm)
- deleteAccount server action — validates email match, cascading delete via Prisma
- Signs user out after successful deletion

### Auth Redirect
- Public home page now redirects authenticated users to /dashboard via useEffect

### OAuth External Client Support
- Added `pages: { signIn: "/" }` to NextAuth config — external OAuth clients (e.g., Learning Speaking App) now see the branded sign-in page instead of the default NextAuth form
- Public page reads `callbackUrl` from URL params — after auth, redirects to the OAuth authorize flow instead of always going to /dashboard
- Public page reads `mode=signup` from URL params — allows external apps to deep-link to the registration step
- Registered LSA as OAuth client via `scripts/seed-lsa-client.ts` (redirect URI: localhost:3000)

## Architecture Decisions

- **Route segment vs route group**: Used `/dashboard/` actual route segment instead of `(dashboard)` route group to avoid conflict with `(public)/page.tsx` at `/`
- **darkMode: "media"**: Tailwind dark mode uses `prefers-color-scheme`, not class toggling
- **Server actions pattern**: All actions follow same shape — session check → rate limit → Zod validate → execute → return AccountActionResult
- **4-file component pattern**: Every component uses types.ts, component.tsx, index.ts, and optional hook/SCSS files
- **Lockout prevention**: Provider disconnect requires password OR another provider to exist

## Files Touched

### New Files
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/settings/password/page.tsx`
- `src/app/dashboard/settings/accounts/page.tsx`
- `src/app/dashboard/settings/delete-account/page.tsx`
- `src/components/ui/DashboardNav/` (4 files)
- `src/components/ui/SettingsCard/` (3 files)
- `src/features/account/server/queries/getUserProfile.ts`
- `src/features/account/server/actions/types.ts`
- `src/features/account/server/actions/updateProfile.ts`
- `src/features/account/server/actions/changePassword.ts`
- `src/features/account/server/actions/disconnectProvider.ts`
- `src/features/account/server/actions/deleteAccount.ts`
- `src/features/account/components/ProfileForm/` (4 files)
- `src/features/account/components/ChangePasswordForm/` (4 files)
- `src/features/account/components/ConnectedAccounts/` (3 files)
- `src/features/account/components/DeleteAccountForm/` (4 files)
- `src/lib/validation/account.ts`

### Modified Files
- `src/app/(public)/page.tsx` — added auth redirect, callbackUrl handling, mode=signup support
- `src/features/auth/server/options.ts` — added `pages: { signIn: "/" }` for branded OAuth flow
- `tailwind.config.cjs` — darkMode changed to "media"

### New Files (OAuth)
- `scripts/seed-lsa-client.ts` — seed script to register LSA as OAuth client
