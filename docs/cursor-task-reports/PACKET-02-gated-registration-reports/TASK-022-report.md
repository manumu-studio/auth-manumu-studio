# TASK-022 Report - Close Social JIT and Silent Linking

**Date:** 2026-06-21
**Branch/worktree:** `feat/task-022-social-jit` at `/private/tmp/auth-manumu-security-hardening`
**Status:** TASK-022 social JIT and silent email linking closure implemented and locally validated.

## Summary

Implemented the Packet 02 social-auth closure:

- Removed `allowDangerousEmailAccountLinking` from Google and GitHub provider config.
- Added a social `signIn` gate that allows OAuth sign-in only for an existing `{ provider, providerAccountId }` account whose linked user is `ACTIVE`.
- Denied unlinked OAuth first sign-in and same-email credentials-account merge attempts before durable `User`/`Account` persistence.
- Wrapped the Prisma adapter so `createUser` and `linkAccount` fail closed if a future NextAuth path reaches adapter persistence unexpectedly.
- Recorded redacted security telemetry for denied social sign-in without email, provider account id, or profile id.

## Research Inputs

- Auth.js provider docs: `allowDangerousEmailAccountLinking` is an explicit opt-in for automatic account linking. See <https://authjs.dev/reference/core/providers>.
- Auth.js error docs: `OAuthAccountNotLinked` exists because Auth.js does not automatically link OAuth accounts to existing accounts when the user is not signed in. See <https://authjs.dev/reference/core/errors>.
- OWASP Email Validation and Verification guidance: email ownership must be verified before relying on email as an identity control. See <https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html>.
- NIST SP 800-63C federation guidance: federation relies on authenticated subscriber sessions and explicit RP/IdP trust boundaries. See <https://pages.nist.gov/800-63-4/sp800-63c.html>.
- GitHub Advisory `GHSA-6g38-8j4p-j3pr`: recent account-takeover case caused by automatic OAuth linking on email/provider-verification assumptions. See <https://github.com/advisories/GHSA-6g38-8j4p-j3pr>.

## Files Changed

- `src/features/auth/server/options.ts`
- `src/features/auth/server/providers/google.ts`
- `src/features/auth/server/providers/github.ts`
- `src/features/auth/server/social/signInGate.ts`
- `src/features/auth/server/social/gatedPrismaAdapter.ts`
- `tests/gated-registration-social-jit.test.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/incidents/INCIDENT_REGISTRY.md`
- `docs/build-packets/PACKET-02-gated-registration.md`

## NextAuth Hook Proof

| Hook / surface | Proof |
|---|---|
| Provider config | Google/GitHub provider option snapshots do not contain `allowDangerousEmailAccountLinking`. |
| `signIn` callback | Unlinked OAuth identities return `false`; same-email credentials users are not looked up or linked by email; inactive/suspended/deleted linked users return `false`; existing linked `ACTIVE` users return `true`. |
| Direct Prisma writes | Denied social sign-in spies prove mocked `user.create` and `account.create` are not called in the callback path. |
| Adapter `createUser` | `createGatedSocialAdapter` throws `SOCIAL_JIT_DISABLED` before the underlying adapter `createUser` spy is invoked. |
| Adapter `linkAccount` | `createGatedSocialAdapter` throws `SOCIAL_LINKING_REQUIRES_EXPLICIT_INTENT` before the underlying adapter `linkAccount` spy is invoked. |
| Browser/telemetry split | Browser denial remains generic through `signIn` returning `false`; audit metadata stores only provider and reason. |

## Compatibility Evidence

- Existing linked social accounts continue to sign in when the linked user is `ACTIVE`.
- Google/GitHub provider factories still return providers when env vars exist.
- Credentials auth, JWT hydration, and session callbacks remain unchanged except for the new social `signIn` gate.
- The adapter wrapper keeps all base adapter methods except the blocked creation/linking methods.

## Validation

| Command | Result |
|---|---:|
| `pnpm exec vitest run tests/gated-registration-social-jit.test.ts` | PASS, 9/9 |
| `pnpm prisma:validate` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS, 203/203 across 18 files |
| `pnpm build` with required production env placeholders | PASS |
| `pnpm audit --audit-level=high` | PASS, no high/critical findings; 1 low and 4 moderate remain below gate |
| `pnpm audit --prod --audit-level=high` | PASS, no high/critical findings; 1 moderate remains below gate |

## Incidents

- `INCIDENT-P008` resolved the pre-existing incident registry conflict markers before further packet work.
- `INCIDENT-P009` resolved Packet 02 governing-evidence drift by replacing missing references with available governing artifacts.

## Handoff

- `options.ts` ownership transfers to TASK-019 for atomic credentials registration and session/status checks.
- Explicit social account linking, including both-factor ceremony and session invalidation on link, remains owned by TASK-023.
- TASK-022 intentionally does not add account-settings UI or an email-equality fallback.
