# ManuMu Studio Authentication

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)
![Deployment](https://img.shields.io/badge/deployed-Vercel-black?logo=vercel)

> Full-stack authentication starter built with Next.js 15, NextAuth.js, Prisma, and PostgreSQL. Supports credentials + OAuth login (GitHub, Google), with email verification, secure sessions, and modular architecture.

---

## 🎯 Overview

**ManuMu Studio Authentication** (or "ManuMu Authentication" in short) is a production-ready authentication starter that provides a complete, secure authentication system out of the box. Built with modern best practices, it offers multiple authentication methods, email verification, and a polished user experience.

### Key Features

- **Auth methods**: Email/password (Credentials) + OAuth (Google, GitHub)
- **Email verification**: Token-based verification with TTL + resend cooldown
- **Sessions**: JWT strategy (stateless) via NextAuth.js
- **Type-safe**: TypeScript + Zod on client and server
- **Database**: Prisma ORM + PostgreSQL (Neon-ready)
- **UI/UX**: Tailwind CSS + Framer Motion (polished multi-step auth flow)
- **Testing**: Critical auth flow coverage (hashing, verification, rate limits)
- **OAuth Registry**: First-party client registry with redirect/origin allowlists
- **OAuth Authorization**: `/oauth/authorize` with consent, PKCE, and short-lived auth codes
- **OAuth Token**: `/oauth/token` exchange for JWT access tokens with PKCE + client auth
- **Account Origin**: Strict separation for Petsgram vs ManuMu users
- **Theme System**: Hybrid approach using Tailwind utilities + SCSS Module overrides with `@media (prefers-color-scheme: dark)` for consistent dark theme support
- **Deploy**: Vercel-ready with environment validation

---

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Authentication**: [NextAuth.js v4](https://next-auth.js.org/) (Auth.js)
- **Database**: [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) (hosted on [Neon Serverless](https://neon.tech))
- **Email**: [Resend](https://resend.com/) (with SMTP fallback support)
- **Validation**: [Zod](https://zod.dev/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

---

## 🌐 Hosted Demo

**Live Demo**: [https://auth.manumustudio.com](https://auth.manumustudio.com)

### Testing the Authentication Flow

To test the authentication system:

1. **Sign up with email**: Enter your email address and create a password. You'll receive a verification email with a one-time login link.
2. **Use OAuth**: Click "Log In With GitHub" or "Log In With Google" for instant authentication (no email verification required).
3. **Email verification**: After signing up with email, check your inbox and click the verification link to activate your account.

> **Note**: The demo uses a development database. Accounts may be reset periodically.

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 20 or higher
- **pnpm** (recommended) or npm/yarn
- **PostgreSQL database** (local or [Neon Serverless](https://neon.tech))

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/auth-manumu-studio.git
cd auth-manumu-studio
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the required values. See [Environment Variables](#-environment-variables) below for details.

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Strong random string (32+ characters)
- `NEXTAUTH_URL` - Application URL (e.g., `http://localhost:3000`)

### 4. Database Setup

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# (Optional) Seed demo users
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔧 Environment Variables

See [`.env.example`](.env.example) for a complete list of all environment variables.

### Required Variables

```bash
# Database (Neon Serverless or local PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# NextAuth.js
NEXTAUTH_SECRET="your-strong-random-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

### Optional Variables

**OAuth Providers** (enable by setting both CLIENT_ID and CLIENT_SECRET):
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`


**Email Provider**:
- `RESEND_API_KEY` - For Resend email service
- `RESEND_FROM` - Sender email address
- Or use SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

**Application**:
- `APP_URL` - Fallback URL for callback assembly
- `VERIFY_TOKEN_TTL_MINUTES` - Token expiration (default: 30)
- `VERIFY_RESEND_COOLDOWN_MINUTES` - Resend cooldown (default: 2)

**Rate Limiting (Upstash)**:
- `UPSTASH_REDIS_REST_URL` - Upstash REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash REST token
- `RATE_LIMIT_MAX` - Max requests per window (default: 3)
- `RATE_LIMIT_WINDOW_MINUTES` - Window length in minutes (default: 60)

**Build/CI**:
- `SKIP_ENV_VALIDATION=true` - Skip env validation during CI builds (build-time only)

### Manual Setup Steps

1. **OAuth Provider Setup**:
   - [Google OAuth Setup Guide](https://console.cloud.google.com/apis/credentials)
   - [GitHub OAuth Setup Guide](https://github.com/settings/developers)
   - Add callback URLs: `{APP_URL}/api/auth/callback/{provider}`

2. **Email Provider**:
   - Sign up for [Resend](https://resend.com/) and get API key
   - Or configure SMTP settings for your email provider
   - Set `RESEND_FROM` to your verified sender address

3. **Generate NEXTAUTH_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

---


## 📁 Project Structure

```
src/
├── app/
│   ├── (public)/          # Public landing page
│   ├── (auth)/            # Auth pages (verify, reset)
│   ├── (dashboard)/       # Protected routes
│   ├── api/
│   │   ├── auth/          # NextAuth API routes
│   │   └── verify/        # Email verification API
│   ├── layout.tsx         # Root layout (SSR session)
│   └── providers.tsx     # Client providers
│
├── features/
│   └── auth/
│       ├── components/    # UI components
│       ├── server/
│       │   ├── actions/   # Server actions
│       │   ├── providers/ # OAuth providers
│       │   └── verify/   # Email verification
│       ├── lib/           # Auth utilities
│       └── types/         # TypeScript types
│
└── lib/
    ├── validation/        # Zod schemas
    ├── prisma.ts          # Prisma client
    └── env.ts             # Environment validation
```

**Note:** The public home page (`app/(public)/page.tsx`) renders UserCard (presentational) and Sign Out button separately when authenticated, maintaining clear separation of concerns.

---

## 🔐 Authentication Architecture

This project uses **NextAuth.js v4** (Auth.js) with JWT strategy and Prisma adapter:

- **Strategy**: JWT sessions (stateless, works with Credentials + OAuth)
- **Adapter**: PrismaAdapter for user/account storage
- **Providers**:
  - **Credentials**: Email/password with email verification gate
  - **Google OAuth**: Conditional (enabled only if env vars present)
  - **GitHub OAuth**: Conditional (enabled only if env vars present)
- **Email Verification**: Required for credentials, auto-trusted for OAuth
- **Account Linking**: Enabled for OAuth providers (same email = same account)

### Sign-In Flow

1. **Email-first UI**: Click "Sign In With Email" → animated form expansion
2. **OAuth Providers**: Click "Log In With Google" or "Log In With GitHub" → OAuth redirect
3. **Credentials**: Validates email verification before allowing login
4. **Session**: JWT token with custom fields (id, role, name, email)

For detailed architecture documentation, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🛡️ Security

This project implements industry-standard security practices:

- **Password Hashing**: bcryptjs with 10 salt rounds
- **Session Security**: JWT tokens signed with strong secret
- **Input Validation**: Zod schemas on client and server
- **Email Verification**: Token-based with TTL and cooldown protection
- **OAuth Security**: Provider-verified email addresses

For comprehensive security documentation, see [`docs/SECURITY.md`](docs/SECURITY.md).

---

## 📚 Documentation

- **[Development Journal](docs/DEVELOPMENT_JOURNAL.md)** - Project development history
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and flow diagrams
- **[Security](docs/SECURITY.md)** - Security practices and considerations
- **[Codebase Audit](docs/CODEBASE_AUDIT.md)** - Comprehensive codebase analysis

---

## 🔧 Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Production build
pnpm start            # Start production server
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint

# Database
pnpm prisma:generate  # Generate Prisma Client
pnpm prisma:migrate   # Create/apply migrations
pnpm prisma:deploy    # Deploy migrations (production)
pnpm db:seed          # Seed demo users
```

---

## 🗂 Roadmap

- [x] Google OAuth integration
- [x] GitHub OAuth integration
- [x] Email verification system
- [x] UI/UX implementation
- [x] Codebase cleanup (100% functional code)
- [x] Rate limiting on auth endpoints
- [x] Rate limiting on API endpoints
- [x] Auth critical flow tests (hashing, verification, rate limits)
- [x] OAuth client registry (redirect/origin allowlists)
- [x] Account origin separation (FIRST_PARTY vs PETSGRAM)
- [ ] Password reset flow
- [ ] Account lockout policy
- [ ] MFA / 2FA
- [ ] Expanded test coverage (integration + E2E)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [NextAuth.js](https://next-auth.js.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Zod](https://zod.dev/)

---

**Happy shipping! 🚀**
