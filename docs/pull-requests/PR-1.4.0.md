# PR 1.4.0 — Protected Dashboard & Account Management

**Branch:** feature/dashboard → main
**Date:** 2026-02-15

## Summary

- Protected dashboard with session-guarded layout and navigation
- Profile management (view/edit name, country, city, address)
- Password change with bcrypt verification
- Connected OAuth accounts management with lockout prevention
- Account deletion with email confirmation and cascading cleanup
- Authenticated users redirected from public page to dashboard
- OAuth external clients now see branded sign-in page instead of NextAuth default
- Sign-in page supports `callbackUrl` for OAuth authorize flow redirect
- Sign-in page supports `mode=signup` query param for deep-linking to registration

## What Was Built

### Routes
| Route | Type | Description |
|-------|------|-------------|
| `/dashboard` | Server | Welcome page with quick-access cards |
| `/dashboard/profile` | Server | Profile editing page |
| `/dashboard/settings` | Server | Settings hub with navigation cards |
| `/dashboard/settings/password` | Server | Password change page |
| `/dashboard/settings/accounts` | Server | Connected OAuth providers |
| `/dashboard/settings/delete-account` | Server | Account deletion with confirmation |

### Components
| Component | Pattern | Location |
|-----------|---------|----------|
| DashboardNav | 4-file + SCSS | `src/components/ui/DashboardNav/` |
| SettingsCard | 3-file | `src/components/ui/SettingsCard/` |
| ProfileForm | 4-file + hook | `src/features/account/components/ProfileForm/` |
| ChangePasswordForm | 4-file + hook | `src/features/account/components/ChangePasswordForm/` |
| ConnectedAccounts | 3-file | `src/features/account/components/ConnectedAccounts/` |
| DeleteAccountForm | 4-file + hook | `src/features/account/components/DeleteAccountForm/` |

### Server Actions
| Action | Rate Limit Scope | Validation |
|--------|-----------------|------------|
| updateProfile | update-profile | UpdateProfileSchema |
| changePassword | change-password | ChangePasswordSchema |
| disconnectProvider | disconnect-provider | DisconnectProviderSchema |
| deleteAccount | delete-account | DeleteAccountSchema |

## Architecture Decisions

1. **Route segment `/dashboard/`** over route group `(dashboard)` to avoid root path conflict
2. **darkMode: "media"** — all dark mode via `prefers-color-scheme`, no class toggling
3. **AccountActionResult type** — unified result shape across all account actions
4. **Lockout guard** on provider disconnect — requires password OR other provider
5. **Cascading delete** — Prisma schema handles cleanup of all related records
6. **`pages: { signIn: "/" }`** — NextAuth routes to branded sign-in page for external OAuth clients
7. **`callbackUrl` handling** — after auth, redirects to OAuth authorize flow instead of always going to /dashboard
8. **`mode=signup` param** — allows external apps to deep-link directly to the registration form

## Testing

- [ ] Sign in → redirected to /dashboard
- [ ] Dashboard shows welcome message with user name
- [ ] Profile page loads current data and saves updates
- [ ] Password change validates current password
- [ ] OAuth-only accounts see "no password" message on password page
- [ ] Connected accounts shows linked providers
- [ ] Cannot disconnect last provider without password
- [ ] Delete account requires exact email match
- [ ] After deletion, user is signed out
- [ ] Dark mode renders correctly across all pages
- [ ] `pnpm build` passes with no errors
- [ ] External OAuth client (LSA) sign-in shows branded page, not NextAuth default
- [ ] After sign-in via OAuth flow, user is redirected back to external app
- [ ] `/?mode=signup` shows registration form directly

## Deployment Notes

- No new environment variables required
- No database migrations needed (uses existing schema)
- Rate limiting uses existing Upstash/memory configuration
