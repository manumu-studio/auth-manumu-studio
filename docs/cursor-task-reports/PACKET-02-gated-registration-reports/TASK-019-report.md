# TASK-019 Report - Atomic Credentials Registration and Activation

**Date:** 2026-06-21
**Branch/worktree:** `feat/task-022-social-jit` at `/private/tmp/auth-manumu-security-hardening`
**Status:** TASK-019 atomic credentials registration implemented and locally validated with one environment-gate concern noted below.

## Summary

Implemented the Packet 02 credentials registration closure:

- Added one shared `registerWithInvite()` service consumed by both credentials signup action entrypoints.
- Removed password hashing, direct `User` credential writes, verification-token creation, and direct verification email sending from signup actions.
- Made registration create an `INACTIVE` first-party user with `hasPasswordCredential = true`, `password = null`, `passwordHash = null`, and `emailVerified = null`.
- Moved password binding to OTP verification: matching the OTP writes `passwordHash`, sets `emailVerified`, transitions `status` to `ACTIVE`, increments `sessionVersion`, deletes verification tokens, and only then mints a session cookie.
- Added non-`ACTIVE` denial across credentials sign-in, JWT/session refresh, post-verify session token minting, OAuth authorization, token exchange/claims, and UserInfo.

## Files Changed

- `src/features/auth/server/registration/registerWithInvite.ts`
- `src/features/auth/server/registration/registerAction.ts`
- `src/features/auth/server/registration/index.ts`
- `src/features/auth/server/actions/signup.ts`
- `src/features/auth/server/oauth/actions/signup.ts`
- `src/features/auth/server/verify/consumeToken.ts`
- `src/app/api/auth/verify/route.ts`
- `src/features/auth/server/createSessionToken.ts`
- `src/features/auth/server/options.ts`
- `src/features/auth/server/oauth/authorization.ts`
- `src/features/auth/server/oauth/claims.ts`
- `src/features/auth/server/oauth/token.ts`
- `src/app/oauth/authorize/page.tsx`
- `src/features/auth/types/next-auth.d.ts`
- `src/lib/validation/verify.ts`
- `tests/gated-registration-credentials.test.ts`
- Updated stale auth/OIDC tests for the new credential lifecycle and active-state fixtures.

## Transaction Boundary

`registerWithInvite()` is the single owner/runner of credentials registration. It consumes TASK-021 CSRF, Turnstile, generic admission failure/timing, and registration limiter helpers before entering mutation work.

Inside one Prisma interactive transaction it:

1. Runs the `RegistrationSession` consume-CAS directly with `updateMany` keyed on `handleHash = sha256(cookieHandle)`, `status = PENDING`, `expiresAt > now`, and `consumedAt = null`.
2. Creates the `INACTIVE` user/profile with no password value.
3. Calls TASK-017 `redeemInviteInTx(txAdapter, resolvedInvite, expectedNormalizedEmail)` with the server-resolved invite identity and row-bound normalized email. No local fallback or raw-token hash lookup was added.
4. Creates one deduplicated `EMAIL_VERIFICATION` outbox row.

The consume-CAS is not keyed on `id` and is not routed through `redeemInviteInTx`. Any consume failure, redeem failure, duplicate-user race, or outbox failure aborts the same transaction and returns the generic admission result.

## Auth/OIDC Denial Points

- Credentials `authorize`: uses TASK-021 login limiter dimensions (`login-ip`, `login-account`), compares against `passwordHash`, and returns the same generic null outcome for unknown email, wrong password, and every non-`ACTIVE` account state.
- JWT/session refresh: reloads `status` and `sessionVersion`; non-`ACTIVE`, missing user, and version mismatch clear the usable session identity.
- Post-verify auto-login: `createSessionToken()` throws unless the freshly loaded user is `ACTIVE`.
- OAuth social sign-in: existing TASK-022 `allowSocialSignIn()` still denies linked non-`ACTIVE` users.
- OAuth authorize page/action: reloads the database user and redirects to sign-in unless `ACTIVE`.
- Authorization code creation: refuses to create codes for missing or non-`ACTIVE` users.
- Token exchange and ID-token claims: `getUserClaims()` returns `null` unless the user is `ACTIVE`; token exchange maps that to `invalid_grant`.
- UserInfo: `getUserClaims()` returning `null` maps to `invalid_token`.

## Session-Version Evidence

Credentials sign-in stores the database `sessionVersion` in the JWT. Existing JWTs without `sessionVersion` resolve as version `0` only while the database user remains version `0`; any later database increment rejects the old token. OTP activation increments `sessionVersion` in the same transaction that sets `passwordHash`, `emailVerified`, and `ACTIVE`, so pre-activation sessions cannot survive into the activated account.

## Pre-Hijack Proof

`tests/gated-registration-credentials.test.ts` includes `[R3-1 pre-hijack]`: an attacker-supplied registration password is ignored at signup, the created row remains `INACTIVE` with `passwordHash = null`, and only the OTP holder can set the password during verification while transitioning the account to `ACTIVE`. The wrong-OTP regression proves no password is written and no activation occurs without the OTP match.

## Validation

| Command | Result |
|---|---:|
| `pnpm exec vitest run tests/gated-registration-credentials.test.ts` | PASS, 10/10 |
| `pnpm prisma:validate` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS, 213/213 across 19 files |
| `pnpm build` | FAIL in this worktree environment: production env validation is missing required deployment values (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `OTP_HMAC_SECRET`, `SELF_SERVICE_REGISTRATION_ENABLED=false`, Turnstile, worker, invite-delivery, and admin-MFA keyring values). Compilation completed before page-data collection failed on env validation. |
| `pnpm build` with non-secret local validation placeholders for the required production env contract | PASS |
| `pnpm audit --audit-level=high` | PASS, no high/critical findings; 1 low and 4 moderate remain below gate |
| `pnpm audit --prod --audit-level=high` | PASS, no high/critical findings; 1 moderate remains below gate |

## Handoff

TASK-019 received `options.ts` from TASK-022, held it only for the non-`ACTIVE` credentials/JWT/session guards, and now releases `options.ts` and `createSessionToken.ts` to TASK-023. No concurrent edit to `options.ts` occurred in this worktree during TASK-019 execution.
