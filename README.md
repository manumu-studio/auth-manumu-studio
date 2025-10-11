# M2 Auth & Profiles — Next.js + Prisma + Postgres (+ Chakra)


A focused Next.js starter with **Credentials + Google OAuth sign-in/sign-up**, **Prisma + Postgres**, and **Chakra UI**. Built with the **App Router**, **TypeScript**, **Zod** validation, and a clean **server/client boundary**.

> Multi-provider authentication hub with email-first UX and one-click Google sign-in. Additional OAuth providers (GitHub, Facebook) can be added as needed.

---

## 🚀 Features

- **Auth**: Credentials + Google OAuth via NextAuth v4 with Prisma adapter
- **Multi-Provider Hub**: Email-first sign-in flow with animated collapse + one-click OAuth
- **Email Verification**: Required for credentials, optional for OAuth (trusted providers)
- **DB**: Prisma ORM + PostgreSQL (Neon-ready)
- **UI**: Chakra UI, responsive layout, modern sign-in hub
- **Validation**: Zod schemas with shared field rules
- **Types**: Full TS, unified `ActionResult` contract, augmented NextAuth types
- **DX**: Clear server/client boundary, Providers split
- **Prisma**: Migrations + optional seeding

---

## 🧪 Demo Users (if seeded)

- **Admin**: `admin@demo.io` / `admin123`
- **User**: `user@demo.io` / `user123`

> Run `pnpm db:seed` to create these users (see below).

---

## ⚡ Quick Start

### Prereqs
- Node 20+
- pnpm

### 1) Install
```bash
pnpm i

2) Environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="dev-only-secret-change-in-prod"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional - sign-in works without it)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: APP_URL fallback for callback URL assembly
APP_URL="http://localhost:3000"
```

Server-only env parsing lives in `src/lib/env.ts` (Zod validated). Real secrets are ignored by Git; only `.env.example` is tracked.

### OAuth Setup (Google)

To enable Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - **Local**: `http://localhost:3000/api/auth/callback/google`
   - **Production**: `https://YOUR_DOMAIN/api/auth/callback/google`
4. Copy Client ID and Client Secret to `.env.local`

> **Note**: Use separate OAuth clients for local and production environments.

3) Database
pnpm prisma:generate
pnpm prisma:migrate
pnpm db:seed     # optional demo users

4) Dev
pnpm dev


Open http://localhost:3000

## 📁 Project Structure (key parts)

```
src/
  app/
    (public)/
      page.tsx              # Multi-provider sign-in hub
    (auth)/
      verify/               # Email verification pages
    api/
      auth/
        [...nextauth]/      # NextAuth route (GET/POST handlers)
        verify/             # Email verification API
      debug-session/        # Session debug endpoint
    layout.tsx              # Server root; SSR session → Providers
    providers.tsx           # Client: SessionProvider + Chakra
  features/
    auth/
      components/
        AuthModal/          # Sign-in/sign-up modal
        AuthLayout/         # Auth page layout wrapper
        SignInForm/         # Credentials sign-in form
        SignupForm/         # User registration form
        ProviderButtons/    # Google + multi-provider hub components
          AuthProvidersGroup.tsx
          GoogleButton/
        UserCard/           # Display current user info
        VerifyBanner/       # Email verification prompt
      server/
        options.ts          # NextAuth config (JWT + Prisma adapter)
        providers/
          google.ts         # Google OAuth provider factory
        actions/
          signin.ts         # Server action for credentials
          signup.ts         # Server action for registration
        verify/
          createToken.ts    # Generate verification tokens
          consumeToken.ts   # Validate and consume tokens
          resend.ts         # Resend verification email
        queries.ts
      lib/
        auth-client.ts      # Client-side auth utilities
        auth-ssr.ts         # Server-side auth utilities
        email/
          provider.ts       # Resend email integration
      types/
        next-auth.d.ts      # Session/user augmentation (role, id)
        verification.d.ts   # Verification token types
  lib/
    env.ts                  # Server-only env loader (Zod)
    prisma.ts               # Prisma client singleton
    validation/
      fields.ts             # Shared field validation schemas
      signin.ts
      signup.ts
      verify.ts
  middleware.ts             # Protected route middleware
  styles/
    globals.scss            # Global styles
  docs/
    journal/                # Development journal entries
    pull-requests/          # PR documentation
```


🔒 Unified Action Result
export type ActionResult =
  | { ok: true }
  | { ok: false; errors: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };


Both actions (signinAction, registerUser) return this shape. Forms branch on ok and show errors.formErrors?.[0] when present.

🔧 Scripts
pnpm dev              # run locally
pnpm build            # production build
pnpm typecheck        # TS check

# Prisma
pnpm prisma:generate  # generate client
pnpm prisma:migrate   # create/apply migrations
pnpm prisma:deploy    # deploy migrations (prod)
pnpm db:seed          # seed demo users (optional)

🧭 Development Journal

See docs/DEVELOPMENT_JOURNAL.md
:

Entry 0 — Bootstrap

Entry 1 — Signup (UI + Server Action)

Entry 2 — Sign-in + Unified Actions + Env/Migration

## 🔐 Authentication Architecture

This project uses **NextAuth v4** with JWT strategy and Prisma adapter:

- **Config**: `src/features/auth/server/options.ts` (Credentials + Google OAuth)
- **Strategy**: JWT sessions (works with both Credentials and OAuth)
- **Adapter**: PrismaAdapter for user/account storage
- **API Route**: `src/app/api/auth/[...nextauth]/route.ts` re-exports NextAuth handlers
- **Providers**:
  - **Credentials**: Email/password with email verification gate
  - **Google OAuth**: Conditional (enabled only if env vars present)
- **Email Verification**: Required for credentials login, auto-trusted for OAuth
- **Account Linking**: Enabled for Google (same email = same account)

### Sign-In Flow

1. **Email-first UI**: Click "Sign In With Email" → animated form expansion
2. **Google OAuth**: Click "Log In With Google" → OAuth redirect
3. **Credentials**: Validates email verification before allowing login
4. **Session**: JWT token with custom fields (id, role, name, email)

## 🗂 Roadmap (next)

- [ ] Additional OAuth providers (GitHub, Facebook)
- [ ] Domain restriction for Google OAuth (`hd` parameter)
- [ ] Unit/integration tests for auth flows
- [ ] Protected routes & role-based access control
- [ ] Multi-factor authentication (MFA)
- [ ] Password reset flow

Happy shipping! 🚀
