# TASK-017 Report - Invite Lifecycle Service

**Date:** 2026-06-21
**Branch/worktree:** `feat/gated-registration` at `/private/tmp/auth-manumu-security-hardening`
**Status:** TASK-017 service foundation implemented and locally validated.

## Summary

Implemented the server-only invite lifecycle service foundation for Packet 02:

- `createInvite` generates a 256-bit base64url token, stores only
  `sha256(rawToken)`, normalizes email binding, applies the seven-day default
  expiry, and returns the raw token only once.
- `lookupInviteByToken` performs side-effect-free generic lookup, including a
  constant-time comparison against a decoy digest on misses.
- `redeemInviteInTx` exposes the three-argument server-resolved signature:
  `redeemInviteInTx(tx, resolvedInvite, expectedNormalizedEmail)`.
- `revokeInvite` idempotently revokes only issued, unexpired invites.
- Redeemed-invite reuse writes a redacted append-only audit event and fires the
  invite reuse alert hook without persisting raw token or plaintext email.

## Files Changed

- `src/features/auth/server/invites/index.ts`
- `src/features/auth/server/invites/invite.types.ts`
- `src/features/auth/server/invites/issueInvite.ts`
- `src/features/auth/server/invites/lookupInvite.ts`
- `src/features/auth/server/invites/redeemInvite.ts`
- `src/features/auth/server/invites/reuseAlert.ts`
- `src/features/auth/server/invites/revokeInvite.ts`
- `src/features/auth/server/invites/token.ts`
- `tests/gated-registration-invites.test.ts`

## Public Service API

```ts
createInvite(input)
lookupInviteByToken(rawToken, expectedEmail)
redeemInviteInTx(tx, resolvedInvite, expectedNormalizedEmail)
revokeInvite(input)
setInviteReuseAlertHandler(handler)
```

`ResolvedInvite = { tokenHash: Buffer } | { inviteId: string }`.

The redemption primitive keeps the approved no-`rawToken` rule: callers pass a
server-resolved invite identity derived from the `RegistrationSession` ref. The
primitive never accepts, reconstructs, or hashes a client-supplied raw token.

## Constraint Note

TASK-016 introduced a database constraint requiring `REDEEMED` invites to carry
`redeemedByUserId`. The approved three-argument TASK-017 redemption signature has
no explicit user-id parameter, so this implementation resolves the already-created
user by `expectedNormalizedEmail` inside the transaction and writes
`redeemedByUserId` during the CAS update. If later TASK-019 needs unbound-invite
redemption, it must either pass the submitted normalized email or explicitly
revise the interface before production wiring.

## Validation

| Command | Result |
|---|---:|
| `pnpm exec vitest run tests/gated-registration-invites.test.ts` | PASS, 5/5 |
| `pnpm prisma:validate` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS, 155/155 across 15 files |
| `pnpm build` with required production env placeholders | PASS |
| `pnpm audit --audit-level=high` | PASS, no high/critical findings |
| `pnpm audit --prod --audit-level=high` | PASS, no high/critical findings |

## Handoff

- TASK-019 consumes `redeemInviteInTx(tx, resolvedInvite, expectedNormalizedEmail)`
  inside the same transaction as registration-session consume, user creation, and
  outbox insertion.
- TASK-026 consumes `createInvite` or a transaction-aware wrapper when pairing
  invite issuance with encrypted outbox delivery.
- TASK-028 must still provide final real-concurrency and end-to-end parity proof.
