# Codebase Audit V1 — auth-manumu-studio

**Date:** 2026-06-18  
**Package Version:** 0.1.0  
**Stack:** TypeScript 5.9 · Next.js 15 App Router · NextAuth v4 · Prisma 6 · PostgreSQL · Vercel  
**Maturity Level:** 3 — Defined  
**Overall Score:** 6.2/10

---

## Executive Summary

The codebase has a recognizable feature-first architecture, a strong Prisma foundation, unusually comprehensive documentation, and several sound auth primitives. Its overall maturity is nevertheless limited by weak operational enforcement: secrets hygiene, dependency governance, observability, CI structure, type-safety enforcement, and test depth are substantially behind the standard established in Learning Speaking App (LSA).

The general security rubric scores the project at 7.0 because it has centralized security headers, Zod on most boundaries, protected application routes, exact OAuth redirect matching, RS256 signing, and no obvious injection primitives. That score must not be mistaken for production readiness: the dedicated adversarial review in `SECURITY-AUDIT-2026-06-17.md` found release-blocking exposure from open registration, ineffective production rate limiting when Upstash is absent, vulnerable dependencies, PKCE downgrade support, non-atomic authorization-code use, and weak OTP storage.

The immediate goal is not the SDK. First close the existing security incident, remove public signup, and bring the engineering gates up to LSA parity. Only then should the project add app membership, pairwise subject identifiers for new clients, and a thin redirect-based SDK.

---

## Scorecard

| Category | Score | Grade | Delta | Evidence |
|----------|-------|-------|-------|----------|
| Testing | 5.0 | C | — | 7 test files for 172 non-test source files (about 1:24.6); Vitest runs in CI, but no coverage thresholds, component tests, or E2E runner |
| Code Complexity | 8.0 | B | — | Average 50.6 lines; no file above 400 lines; one 306-line production page; 12 files show deep-indentation signals |
| Performance | 5.0 | C | — | `next/image` and JWKS caching exist; no bundle analyzer, size budget, lazy-loading strategy, ISR plan, or RUM |
| Security | 7.0 | B | — | Zod on 12/16 primary input boundaries and strong headers; critical auth-specific and abuse-prevention gaps remain |
| Secrets Management | 4.0 | D | — | Env files ignored and Zod-validated, but seed credentials are hardcoded, secrets are printed during seeding, env docs are stale, and CI has no secret scan |
| Dependency Management | 4.0 | D | — | Both pnpm and stale npm lockfiles are tracked; mixed install strategies; no update bot or audit gate; prior audit found critical/high vulnerabilities |
| Architecture | 8.0 | B | — | Clear feature-first App Router structure and mostly thin routes; duplicated auth actions, one monolithic page, and some route-level DB access |
| Type Safety | 6.0 | C | — | `strict` and several flags enabled with zero explicit `any`; four required strict flags missing, 27 assertion hits, one non-null assertion, incomplete runtime parsing |
| Database | 8.0 | B | — | Prisma, 7 migrations, indexes/uniques, transactions, no raw SQL/N+1 pattern; token lookup index and some atomicity gaps remain |
| CI/CD | 5.7 | C | — | Typecheck, lint, test, build, and smoke steps exist; no security scan, coverage gate, bundle budget, deploy gate, or LSA-style job separation |
| Observability | 3.6 | D | — | Console-only logging, no Sentry/Pino/tracing/alerts, and the configured `/api/healthz` smoke target has no route |
| Error Handling | 5.8 | C | — | Auth-specific error pages and controlled API errors exist; no global error boundary, shared recovery strategy, or crash reporting |
| Documentation | 9.3 | A | — | 332-line README, architecture diagrams, OpenAPI, changelog, decisions, and a healthy sampled comment ratio; one stale README path |
| Developer Experience | 6.6 | C | — | Broad scripts, Husky, env example, and setup docs; no formatter/editor config/devcontainer and several manual provider steps |
| Accessibility | 7.6 | B | — | Semantic landmarks, broad ARIA use, complete sampled alt coverage, focus/keyboard support; no skip link or automated a11y tests |

**Legend:** ↑ improved · ↓ regressed · → unchanged · — no previous full audit

---

## Category Deep Dives

### Testing — 5.0 (C)

**Strengths**

- [code-verified] Vitest is configured and invoked by CI.
- [code-verified] Existing tests cover important OAuth, verification, and auth behavior with mocks and fake timers.
- [code-verified] `@vitest/coverage-v8` is already installed.

**Gaps**

- [tool-verified] Only 7 test files exist for 172 non-test source files.
- [code-verified] `vitest.config.ts` has no coverage thresholds.
- [code-verified] There is no Playwright/Cypress configuration, HTTP-boundary test layer, or component-testing stack.

### Code Complexity — 8.0 (B)

**Strengths**

- [tool-verified] Average source-file length is 50.6 lines.
- [tool-verified] No source file exceeds 400 lines and none has more than 10 exports.
- [code-verified] Most auth logic is separated into feature/server modules.

**Gaps**

- [tool-verified] `src/app/(public)/page.tsx` is 306 lines and mixes state, validation, auth orchestration, redirects, and animation.
- [tool-verified] Twelve files contain deep-indentation signals.
- [code-verified] ESLint does not enforce LSA's file, function, complexity, depth, or parameter limits.

### Performance — 5.0 (C)

**Strengths**

- [code-verified] The UI uses `next/image`.
- [code-verified] The JWKS route sets an explicit cache header.
- [code-verified] Next.js production builds are configured.

**Gaps**

- [code-verified] No bundle analyzer or CI size budget.
- [code-verified] No `next/dynamic` or `React.lazy` usage.
- [code-verified] No Web Vitals/RUM, broader cache strategy, or performance alerting.

### Security — 7.0 (B)

**Strengths**

- [code-verified] Middleware sets CSP, HSTS, `X-Frame-Options`, nosniff, and Referrer Policy.
- [code-verified] Zod validates 12 of 16 primary input-taking handlers.
- [code-verified] Protected pages/actions verify sessions, redirect URIs use exact registration checks, JWTs use RS256, and no raw SQL/eval/XSS sink was found.

**Gaps**

- [code-verified] Open signup, optional production Upstash, unprotected OAuth endpoints, PKCE `plain`, non-atomic code use, and weak OTP storage remain open; see the dedicated security audit.
- [code-verified] `/oauth/token`, authorize handling, logout, and UserInfo use manual checks rather than consistent Zod schemas.
- [code-verified] `allowDangerousEmailAccountLinking` is enabled for social providers.
- [code-verified] Access-token decoding lacks full issuer/audience/schema validation.
- [code-verified] Password-reset tokens are stored in directly queryable form.

### Secrets Management — 4.0 (D)

**Strengths**

- [tool-verified] `.env` and local variants are ignored and untracked.
- [code-verified] Runtime environment parsing uses Zod.
- [code-verified] OAuth client secrets are hashed before persistence.

**Gaps**

- [code-verified] `prisma/seed.ts` contains `admin123` / `user123` and logs generated credentials/client secrets.
- [code-verified] `.env.example` is missing at least 12 schema-supported variables.
- [tool-verified] No gitleaks/TruffleHog CI gate exists.

### Dependency Management — 4.0 (D)

**Strengths**

- [code-verified] A pnpm lockfile and frozen install are used in the primary CI job.
- [code-verified] The direct dependency set is relatively small.

**Gaps**

- [tool-verified] Both `pnpm-lock.yaml` and a stale `package-lock.json` are tracked.
- [code-verified] CI mixes frozen pnpm installs with `npm install --legacy-peer-deps`.
- [tool-verified] No Dependabot/Renovate configuration exists.
- [tool-verified] The current sandbox could not reach npm; the June 17 audit recorded vulnerable production dependencies and no blocking audit gate.

### Architecture — 8.0 (B)

**Strengths**

- [code-verified] The App Router, `src/features`, `src/components/ui`, and `src/lib` form clear boundaries.
- [code-verified] Most route handlers delegate to feature/server services.
- [tool-verified] Component folder/type/barrel compliance is high.

**Gaps**

- [tool-verified] Sign-in and sign-up actions are duplicated under both `server/actions` and `server/oauth/actions`.
- [code-verified] The public auth page is a monolithic client component.
- [code-verified] The verification route performs a direct Prisma lookup instead of delegating the complete flow.

### Type Safety — 6.0 (C)

**Strengths**

- [code-verified] `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, and `noFallthroughCasesInSwitch` are enabled.
- [tool-verified] No explicit production `any` was found.
- [tool-verified] Fifty `import type` statements and multiple discriminated result unions exist.

**Gaps**

- [code-verified] `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, and `forceConsistentCasingInFileNames` are missing.
- [tool-verified] Twenty-seven non-`as const` assertion hits remain.
- [code-verified] External JSON is asserted in the token route, OTP hook, and JWT parsing instead of Zod-parsed.
- [code-verified] `user.email!` violates the no-non-null-assertion standard.

### Database — 8.0 (B)

**Strengths**

- [tool-verified] Prisma schema plus 7 tracked migrations.
- [code-verified] No raw SQL or obvious query-in-loop patterns.
- [code-verified] Verification and password-reset mutations use transactions.

**Gaps**

- [code-verified] Verification-token queries need a supporting `@@index([identifier, expires])`.
- [code-verified] Some read/modify/write flows are not atomic end to end.
- [code-verified] Seed behavior is unsafe for any shared environment.

### CI/CD — 5.7 (C)

**Strengths**

- [code-verified] CI runs typecheck, lint, tests, build, Prisma generation, and a smoke step.
- [code-verified] pnpm caching is configured.
- [code-verified] A second build approximates Vercel behavior.

**Gaps**

- [code-verified] The main checks are sequential in one job rather than LSA's parallel quality lanes.
- [code-verified] No audit, secret scan, coverage threshold, bundle budget, E2E, preview, or deploy status gate.
- [code-verified] The lint script includes `--fix`, so CI may mutate its checkout.
- [code-verified] Build configuration bypasses environment validation.

### Observability — 3.6 (D)

**Strengths**

- [code-verified] A few security-relevant warnings/errors exist.
- [code-verified] Upstash analytics is enabled when Redis is configured.

**Gaps**

- [tool-verified] No structured logger, Sentry, tracing, metrics, RUM, or alerting.
- [code-verified] No request correlation IDs.
- [tool-verified] No health/readiness route exists.
- [code-verified] The `smoke` script calls `/api/healthz`, which is absent.

### Error Handling — 5.8 (C)

**Strengths**

- [code-verified] OTP and password-reset flows have dedicated user-facing error pages.
- [code-verified] Several API paths return controlled protocol-shaped errors.
- [code-verified] Password-reset requests avoid account enumeration.

**Gaps**

- [tool-verified] No `error.tsx`, `global-error.tsx`, or route-level `loading.tsx` exists.
- [code-verified] No centralized error serialization/reporting layer.
- [code-verified] Some protocol endpoints return detailed `error_description` values without a single exposure policy.

### Documentation — 9.3 (A)

**Strengths**

- [tool-verified] README is 332 lines with setup, architecture, security, scripts, roadmap, and license.
- [tool-verified] Architecture diagrams, OpenAPI, decision records, changelog, incident docs, packet docs, and continuation docs exist.
- [tool-verified] Sampled source comment ratio is about 9%.

**Gaps**

- [code-verified] README references `app/(public)/page.tsx`; the real path starts with `src/`.
- [code-verified] The roadmap index still says February 2026 and does not include the newly defined security/IdP sequence.
- [code-verified] Existing security packets do not include an explicit final documentation task, which violates the project's current documentation rule.

### Developer Experience — 6.6 (C)

**Strengths**

- [code-verified] Good script coverage for development, build, tests, Prisma, seed, smoke, and validation.
- [code-verified] Husky runs lint, typecheck, and tests.
- [code-verified] Setup and env requirements are documented.

**Gaps**

- [tool-verified] No Prettier, `.editorconfig`, VS Code settings, devcontainer, or task runner.
- [code-verified] Setup still requires several manual provider/security steps.
- [code-verified] Mixed npm/pnpm behavior makes local and CI dependency trees less predictable.

### Accessibility — 7.6 (B)

**Strengths**

- [code-verified] Root layout sets `lang="en"`.
- [tool-verified] Five semantic landmark types and 50 ARIA occurrences were found.
- [tool-verified] All three sampled Next Image uses include alt text.
- [code-verified] Focus-visible and keyboard patterns exist.

**Gaps**

- [tool-verified] No skip-navigation link.
- [tool-verified] No axe/vitest-axe/pa11y/Lighthouse accessibility gate.
- [tool-verified] Keyboard-specific handling is present in only two files.

---

## Delta Comparison

*This is the first full 15-category audit (V1). Delta tracking begins with V2. The June 17 report is a specialized security audit and is not used as a numeric V0 baseline.*

---

## LSA Standards Comparison

LSA's latest available baseline is `AUDIT-V11-LEARNING-SPEAKING-APP.md` dated 2026-06-13.

| Category | Auth | LSA V11 | Gap |
|----------|------|---------|-----|
| Testing | 5.0 | 7.8 | -2.8 |
| Code Complexity | 8.0 | 9.2 | -1.2 |
| Performance | 5.0 | 8.0 | -3.0 |
| Security | 7.0 | 8.1 | -1.1 |
| Secrets Management | 4.0 | 9.0 | -5.0 |
| Dependency Management | 4.0 | 7.0 | -3.0 |
| Architecture | 8.0 | 9.1 | -1.1 |
| Type Safety | 6.0 | 9.3 | -3.3 |
| Database | 8.0 | 8.7 | -0.7 |
| CI/CD | 5.7 | 8.8 | -3.1 |
| Observability | 3.6 | 8.2 | -4.6 |
| Error Handling | 5.8 | 8.0 | -2.2 |
| Documentation | 9.3 | 9.5 | -0.2 |
| Developer Experience | 6.6 | 8.8 | -2.2 |
| Accessibility | 7.6 | 8.0 | -0.4 |
| **Overall** | **6.2** | **8.5** | **-2.3** |

### Standards to adopt directly

1. All eight TypeScript strictness flags and the no-assertion/no-non-null policy.
2. Next core-web-vitals/TypeScript ESLint presets plus CI-blocking complexity limits.
3. Parallel CI lanes: lint/typecheck, audit/secret scan, tests/coverage, build/bundle/smoke, and E2E.
4. Pino structured logs, request IDs, Sentry error capture, and a real health endpoint.
5. Coverage thresholds, Playwright golden paths, and automated accessibility tests.
6. Living-document synchronization and docs-last completion gates.

### Standards not to copy blindly

- LSA is an RP/product application; this project is the central IdP. OAuth BCP, credential, token, abuse, and key-management controls must be stricter here.
- Do not migrate to NextAuth/Auth.js v5 merely for parity while it is still a separate breaking-risk decision.
- Do not copy LSA's AI evaluation, speech, mobile, or domain-specific infrastructure.
- Copy LSA's documentation discipline, not its document volume.

---

## CV Bullet Points

### Portfolio-Ready Claims (categories scoring ≥ 7)

- Engineered a feature-first Next.js authentication architecture with 24 component modules, typed boundaries, and thin OAuth route delegation.
- Established layered OAuth/OIDC defenses with RS256 signing, exact redirect-URI matching, centralized security headers, and runtime validation on 12 of 16 primary request boundaries.
- Designed a Prisma-backed identity model with 7 tracked migrations, indexed OAuth authorization codes, transactional verification/reset flows, and no raw SQL.
- Built a comprehensive engineering documentation system spanning a 332-line README, architecture diagrams, OpenAPI contracts, ADRs, incident records, and resumable work packets.
- Implemented accessible authentication interfaces with semantic landmarks, broad ARIA coverage, complete sampled image alt text, and visible focus states.

### What NOT to Claim

- Do not claim high automated test coverage or mature E2E validation.
- Do not claim production-grade secrets management or dependency governance.
- Do not claim full TypeScript boundary safety.
- Do not claim mature CI/CD, observability, or global error recovery.
- Do not claim the auth server is hardened against serious attack until Incident P001 is resolved and production-verified.

---

## Honest Gaps

- Public registration remains open.
- Production rate limiting can silently degrade to process-local memory.
- Known vulnerable dependencies and no blocking audit gate were recorded on June 17.
- OAuth token/UserInfo endpoints, PKCE, authorization-code use, OTP storage, JWT claim validation, reset tokens, and provider account linking need further hardening.
- The project cannot currently detect, correlate, alert on, or diagnose many production auth failures.
- A single stale lockfile and mixed package-manager strategy can reproduce different dependency trees.
- The SDK architecture is researched but not yet supported by the necessary security, app-membership, subject-identifier, release, and compatibility foundations.

---

## Remediation Roadmap

### Tier 1 — Quick Wins (< 4 hours, high impact)

1. Enable the four missing TypeScript flags and fix resulting errors. **Category:** Type Safety. **Impact:** +1.0.
2. Replace CI's fixing lint command with a read-only lint gate. **Category:** CI/DX. **Impact:** +0.3.
3. Remove the stale npm lockfile and standardize every environment on pnpm frozen installs. **Category:** Dependencies/DX. **Impact:** +0.8.
4. Add the missing verification-token composite index. **Category:** Database. **Impact:** +0.2.
5. Add a real `/api/healthz` route or point smoke checks at an existing health route. **Category:** Observability/CI. **Impact:** +0.5.
6. Add skip navigation and a root `error.tsx`. **Category:** Accessibility/Error Handling. **Impact:** +0.4.
7. Correct stale README/roadmap references and add explicit documentation-last tasks to both active security packets. **Category:** Documentation/DX. **Impact:** +0.2.

### Tier 2 — Sprint-Sized (4–16 hours, meaningful improvement)

1. Execute `PACKET-security-hardening-now`; verify Incident P001 remediation in CI and production. **Category:** Security/Secrets/Dependencies/CI. **Impact:** +1.5 to +2.0.
2. Execute `PACKET-gated-registration`; remove open signup and add invite/allowlist/bot defenses. **Category:** Security. **Impact:** +0.8.
3. Add LSA-style ESLint presets and complexity gates, then split the public auth page and duplicated action modules. **Category:** Complexity/Architecture/Type Safety. **Impact:** +1.0.
4. Add Vitest coverage thresholds and tests for OAuth token, authorization-code race, OTP, invite, reset, and account-linking behavior. **Category:** Testing. **Impact:** +1.5.
5. Split CI into parallel LSA-style jobs with audit, gitleaks, coverage, bundle budget, smoke, and Playwright. **Category:** CI/Dependencies/Secrets. **Impact:** +1.5.
6. Add Pino, request IDs, Sentry, sanitized error serialization, and health/readiness checks. **Category:** Observability/Error Handling. **Impact:** +2.0.

### Tier 3 — Project-Sized (16+ hours, strategic investment)

1. Complete remaining security work: hashed reset tokens, safe provider linking, full JWT issuer/audience/schema verification, session lifecycle, enumeration controls, CSRF consent protection, refresh-token rotation/revocation, and key rotation. **Category:** Security. **Impact:** +1.5.
2. Introduce `App`, `AppMembership`, and `AppSubject`; preserve public subjects for existing RPs and use pairwise subjects for new clients. **Category:** Architecture/Database/Security. **Impact:** +1.0.
3. Build the thin redirect-based `@manumu/auth` SDK only after the hardened IdP contract, compatibility tests, release process, and client onboarding model are stable. **Category:** Architecture/DX/Testing. **Impact:** +1.0.

---

## Recommended Execution Order

1. Amend the existing packets so tests, incident closure, living docs, journal, PR docs, and versioning are explicit final tasks.
2. Execute `PACKET-security-hardening-now`.
3. Execute `PACKET-gated-registration`.
4. Create and execute one **LSA foundation parity packet** for strict TypeScript, ESLint complexity gates, pnpm-only dependency governance, parallel CI, coverage/E2E, observability, and error boundaries.
5. Re-audit as V2 and require no critical/high release blockers.
6. Implement the IdP platform model (`AppMembership`, app registry, pairwise subject support).
7. Publish the redirect-based SDK.

---

*Generated by Codebase Audit Agent v1.0.0 · Evidence tagged as [code-verified] or [tool-verified]*
