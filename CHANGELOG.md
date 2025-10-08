# 📦 Changelog

All notable changes to this project will be documented in this file.  
This format follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [v0.2.0] - 2025-10-08
### ✨ Features
- **auth, app:** SSR-hydrated sessions for instant state recognition  
- **UI:** Removed unauthenticated flicker (SSR session hydration)  
- **auth-modal:** Unified “sign in / sign up” layout  
- **server-actions:** Unified `ActionResult` contract with Zod validation  
- **architecture:** Migrated to feature-based folder structure (`src/features/auth/*`)  

### 🧠 Developer Experience
- Added 20 README files for full documentation coverage  
- Added `docs/pull-requests/PR-0.2.0.md` deep dive reference  
- Updated `.env.example` and validation via `lib/env.ts`  
- Lint, typecheck, and build all pass (0 errors)

### 🧪 Testing
- ✅ Sign-in and sign-up flows validated  
- ✅ SSR hydration confirmed (no flicker)  
- ✅ Session persistence across reloads  
- ✅ Logout clears session consistently  

### 📚 Docs
- Full PR write-up: [`docs/pull-requests/PR-0.2.0.md`](docs/pull-requests/PR-0.2.0.md)

---

## [v0.1.0] - 2025-10-03
Initial setup:
- Credentials-based auth (NextAuth + Prisma)
- Zod validation schemas
- Chakra UI + ESLint/Prettier setup
- Seed data for test users
