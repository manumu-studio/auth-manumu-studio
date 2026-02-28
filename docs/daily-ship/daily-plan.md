# 31-Day Daily Ship Plan

## Phase 1: Feature Work (Days 1–16)

### Packet A — Form & Validation (Days 1–8)

#### Day 1 — A1: Nickname schema + migration
- **Branch:** `feat/a1-nickname-schema`
- **Work:** Add `nickname` (String?, max 30) to User model in `prisma/schema.prisma`. Run `prisma migrate dev`.
- **Acceptance:** Migration created, `prisma validate` passes, build succeeds.
- **Files:** `prisma/schema.prisma`, new migration file

#### Day 2 — A1: Nickname in signup form + validation
- **Branch:** `feat/a1-nickname-signup-form`
- **Work:** Add nickname field to `SignupStep.tsx`. Add to `SignUpSchema` in `src/lib/validation/signup.ts`. Wire to `registerUser` server action.
- **Acceptance:** Signup form shows nickname field, validates max 30 chars, saves to DB.
- **Files:** `SignupStep.tsx`, `signup.ts` (validation), `signup.ts` (server action)

#### Day 3 — A1: Nickname in profile + OIDC claims
- **Branch:** `feat/a1-nickname-profile-oidc`
- **Work:** Add nickname to `ProfileForm`, `UpdateProfileSchema`. Add `nickname` claim to OIDC userinfo (`claims.ts`).
- **Acceptance:** Users can edit nickname in dashboard. OIDC `/oauth/userinfo` returns nickname claim.
- **Files:** `ProfileForm/`, `signup.ts`, `claims.ts`

#### Day 4 — A2: Country data file + schema change
- **Branch:** `feat/a2-country-data-schema`
- **Work:** Create `src/lib/data/countries.ts` (ISO 3166-1 alpha-2 + display names). Make `country` required in Prisma schema + migration. Update `SignUpSchema`.
- **Acceptance:** Country list exported, schema migrated, validation requires country.
- **Files:** `countries.ts` (new), `schema.prisma`, migration, `signup.ts`

#### Day 5 — A2: Country dropdown UI
- **Branch:** `feat/a2-country-dropdown-ui`
- **Work:** Replace text input with `<select>` in `SignupStep.tsx` and `ProfileForm`. Use countries data file.
- **Acceptance:** Dropdown renders full country list, validates selection, saves correctly.
- **Files:** `SignupStep.tsx`, `ProfileForm/`

#### Day 6 — A2b: OAuth onboarding gate (complete your profile)
- **Branch:** `feat/a2b-oauth-onboarding-gate`
- **Work:** After first OAuth sign-in (Google/GitHub), users have no country or nickname. Add middleware check: if authenticated user has `country === null`, redirect to `/onboarding` before allowing access to `/dashboard/*`. Create `/onboarding` page with country dropdown (required) + nickname (optional) form. On submit, update profile and redirect to dashboard. Skip gate for email/password users (they already provided country during signup).
- **Acceptance:** New Google/GitHub user signs in → lands on `/onboarding` → must select country → then reaches dashboard. Existing users with country set skip the gate entirely. Returning OAuth users who already completed onboarding go straight to dashboard.
- **Files:** `middleware.ts`, `src/app/(auth)/onboarding/page.tsx` (new), new `OnboardingForm/` component, server action for onboarding save

#### Day 7 — A3: Password strength validation
- **Branch:** `feat/a3-password-strength-rules`
- **Work:** Upgrade `passwordSchema` in `fields.ts` — min 8, uppercase, lowercase, number, special char. Optional: top-100 common password blocklist. Apply to all password forms.
- **Acceptance:** Weak passwords rejected in signup, reset, and change password forms.
- **Files:** `fields.ts`, `ForgotPasswordForm/`, `ResetPasswordForm/`, `ChangePasswordForm/`

#### Day 8 — A3: Password strength indicator UI
- **Branch:** `feat/a3-password-strength-indicator`
- **Work:** Add real-time visual strength indicator to `SignupStep.tsx` (checklist or color bar showing which rules pass). Apply to reset/change forms too.
- **Acceptance:** User sees live feedback as they type password. All rules displayed.
- **Files:** `SignupStep.tsx`, possible new `PasswordStrength/` component

---

### Packet B — Auth Fixes (Days 9–12)

#### Day 9 — B1: RP-Initiated Logout endpoint
- **Branch:** `feat/b1-rp-logout-endpoint`
- **Work:** Create `src/app/oauth/logout/route.ts`. Accept `id_token_hint`, `post_logout_redirect_uri`, `state`. Validate redirect URI against registered clients. Clear NextAuth session. Redirect.
- **Acceptance:** Calling `/oauth/logout?id_token_hint=...&post_logout_redirect_uri=...` clears session and redirects.
- **Files:** `route.ts` (new), possibly `clients.ts` for validation

#### Day 10 — B1: Discovery doc + logout documentation
- **Branch:** `feat/b1-logout-discovery-docs`
- **Work:** Add `end_session_endpoint` to `openid-configuration/route.ts`. Document LSA integration notes in `docs/`. Add test for logout endpoint.
- **Acceptance:** `/.well-known/openid-configuration` includes `end_session_endpoint`. Test passes.
- **Files:** `openid-configuration/route.ts`, `docs/`, test file

#### Day 11 — B2: OAuth-only gate middleware
- **Branch:** `feat/b2-oauth-gate-middleware`
- **Work:** Update `middleware.ts` — if no OAuth params (`client_id`, `redirect_uri`, `state`) in URL or session, block access to auth pages. Store OAuth context in cookie. Allow `/dashboard/*`, `/verify/*`, `/reset-password/*`.
- **Acceptance:** Direct visit to `/` without OAuth params gets blocked. OAuth flow still works. Dashboard accessible.
- **Files:** `middleware.ts`

#### Day 12 — B2: Landing page for direct visitors
- **Branch:** `feat/b2-landing-page`
- **Work:** Create landing page component shown when OAuth gate blocks access. Message: "Sign in through one of our partner apps." List registered apps if appropriate. Clean design matching auth theme.
- **Acceptance:** Direct visitors see informative page instead of login form.
- **Files:** New landing page component/page

---

### Packet C — Email OTP (Days 13–16)

#### Day 13 — C1: OTP generation + storage
- **Branch:** `feat/c1-otp-generation`
- **Work:** Replace token generation in `createToken.ts` with 6-digit numeric code. Hash with SHA-256, store hash. TTL: 10 min. Same 2-min cooldown. Add attempt counter field to `VerificationToken` model (migration).
- **Acceptance:** OTP generated, hashed, stored. Migration applied. Old token flow replaced.
- **Files:** `createToken.ts`, `schema.prisma`, migration

#### Day 14 — C2: OTP verification UI
- **Branch:** `feat/c2-otp-verification-ui`
- **Work:** Create/modify `src/app/(auth)/verify/page.tsx` — 6-digit input (individual boxes or single input). Auto-submit on 6 digits. Countdown timer. "Resend code" button with cooldown. Error states.
- **Acceptance:** User can enter 6-digit code, sees timer, can resend, sees errors.
- **Files:** `verify/page.tsx`, possible new `OtpInput/` component

#### Day 15 — C3: OTP verification backend
- **Branch:** `feat/c3-otp-verify-backend`
- **Work:** Update `consumeToken.ts` — accept code, hash, compare. Track attempts (max 5). After 5 fails → invalidate, require resend. API route or server action for verification.
- **Acceptance:** Correct code verifies. Wrong code increments counter. 5th fail invalidates.
- **Files:** `consumeToken.ts`, API route or server action

#### Day 16 — C4: OTP email template
- **Branch:** `feat/c4-otp-email-template`
- **Work:** Update email template — show 6-digit code prominently (large, spaced). Remove clickable verification link. Add "expires in 10 minutes" text.
- **Acceptance:** Verification email shows code clearly. No link. Expiry noted.
- **Files:** Email template files in `src/features/auth/server/verify/`

---

## Phase 2: Hardening (Days 17–31)

#### Day 17 — Test: Nickname field + OAuth onboarding
- **Branch:** `test/nickname-field`
- **Work:** Unit tests for nickname validation (max length, optional, special chars). Integration test for signup with nickname. Test OIDC userinfo returns nickname. Test OAuth onboarding gate redirects users with null country.
- **Files:** New/updated test files in `tests/`

#### Day 18 — Test: Country dropdown
- **Branch:** `test/country-validation`
- **Work:** Test country is required in signup. Test dropdown values match ISO codes. Test profile update with country.
- **Files:** `tests/`

#### Day 19 — Test: Password strength
- **Branch:** `test/password-strength`
- **Work:** Test all password rules (upper, lower, number, special, length). Test common password blocklist. Test edge cases (unicode, spaces).
- **Files:** `tests/`

#### Day 20 — Test: Federated sign-out
- **Branch:** `test/federated-logout`
- **Work:** Test logout endpoint: valid/invalid id_token_hint, redirect URI validation, session clearing, state passthrough.
- **Files:** `tests/`

#### Day 21 — Test: OAuth gate
- **Branch:** `test/oauth-gate`
- **Work:** Test middleware blocks direct access. Test OAuth params allow through. Test dashboard still accessible. Test verify/reset pages accessible.
- **Files:** `tests/`

#### Day 22 — Test: OTP flow
- **Branch:** `test/otp-flow`
- **Work:** Test OTP generation (6 digits, hashed). Test verification (correct/wrong code). Test attempt limit (5 max). Test expiry (10 min). Test resend cooldown.
- **Files:** `tests/`

#### Day 23 — Accessibility: Form audit
- **Branch:** `chore/a11y-forms`
- **Work:** Audit all forms for ARIA labels, error announcements, required field indicators, focus management on errors. Fix issues found.
- **Files:** All form components

#### Day 24 — Accessibility: Keyboard + screen reader
- **Branch:** `chore/a11y-keyboard`
- **Work:** Test keyboard navigation through entire auth flow. Fix tab order, focus traps, skip links. Test with VoiceOver. Fix aria-live regions.
- **Files:** Layout components, form components

#### Day 25 — Performance: Lighthouse audit
- **Branch:** `chore/perf-lighthouse`
- **Work:** Run Lighthouse on all pages. Fix low-hanging fruit: image optimization, font loading, CLS issues, render-blocking resources.
- **Files:** `next.config.ts`, layout files, image components

#### Day 26 — Performance: Bundle analysis
- **Branch:** `chore/perf-bundle`
- **Work:** Add `@next/bundle-analyzer`. Analyze bundle. Identify large dependencies. Add dynamic imports where beneficial. Document findings.
- **Files:** `next.config.ts`, `package.json`, components with heavy imports

#### Day 27 — Security: Headers + hardening
- **Branch:** `chore/security-headers`
- **Work:** Add/review security headers in `next.config.ts` or middleware: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Review rate limit thresholds. Check for any exposed env vars.
- **Files:** `next.config.ts`, `middleware.ts`

#### Day 28 — DX: Error states + loading
- **Branch:** `chore/error-loading-states`
- **Work:** Add proper loading states to all async operations (signup, login, verify, profile update). Add user-friendly error boundaries. Add `error.tsx` and `loading.tsx` where missing.
- **Files:** Page-level error/loading files, form components

#### Day 29 — Release: v1.0.0 prep
- **Branch:** `chore/v1-release-prep`
- **Work:** Update `CHANGELOG.md` with all changes since v0.2.0. Update `README.md` if needed. Review all docs for accuracy. Prepare release notes.
- **Files:** `CHANGELOG.md`, `README.md`, `docs/`

#### Day 30 — Docs: Architecture + API
- **Branch:** `docs/architecture-update`
- **Work:** Update `ARCHITECTURE.md` with new OTP flow, OAuth gate, logout endpoint. Document all API endpoints (request/response). Update roadmap status.
- **Files:** `docs/ARCHITECTURE.md`, `docs/roadmap/`

#### Day 31 — Polish: UI consistency
- **Branch:** `chore/ui-polish`
- **Work:** Review all pages for visual consistency — spacing, colors, typography, responsive behavior. Fix any inconsistencies. Final screenshot updates for README.
- **Files:** Component styles, `README.md` screenshots

---

## After Day 31

You'll have:
- ✅ All 3 packets shipped (A, B, C) + OAuth onboarding gate
- ✅ Full test coverage for new features
- ✅ Accessibility pass
- ✅ Performance optimization
- ✅ Security hardening
- ✅ v1.0.0 released
- ✅ 31 days of real green on GitHub

### What's next (Phase 3+)
- Add Playwright E2E tests for critical flows
- i18n (internationalization) if relevant
- Admin dashboard for client management
- Rate limit dashboard/monitoring
- Open-source a component or utility
- Start a new project (labs repo) for continued daily green
