# PACKET-02: Secure Gated Registration

**Version:** `1.8.5 -> 1.9.0`
**Mode:** PACKET - auth, security, migration, and production release
**Status:** DESIGN APPROVED FOR IMPLEMENTATION — ROUND 6 PASS/GO (2026-06-20). Vendor pass #1 (GPT-5.5, different model family, read-only) ran 6 times: NO-GO(7,4B) → NO-GO(4,1B: N1–N4) → NO-GO(4,0B: R3-1..R3-4) → NO-GO(5,0B: G1–G5) → NO-GO(3,0B: V5-1..V5-3) → PASS/GO. RUN 6 closed V5-1 (credential-scoped activation/password binding), V5-2 (TASK-024 strictly depends on TASK-025), and V5-3 (SSO/passwordless admin first-factor enrollment deferred and fail-closed). See docs/research/PACKET-02-REMEDIATION-CONTRACT.md (ROUND 6) and docs/research/PACKET-02-VENDOR-REVIEW-1-RUN6-RESULT.md. TASK-016 is implemented, and the post-Wave-1 contract conformance gate passed on 2026-06-21. Release remains gated on TASK-028/TASK-029 execution evidence and the later release review.
**Production baseline:** `origin/main` at `a82382d6`
**Depends on:** Packet 01 merged, deployed, and production-verified

## Goal

Replace the temporary production signup kill switch with a durable private
registration system. No global identity may be created or activated unless it
uses a valid invitation, an explicit allowlist policy, or an audited
administrator action. Every account remains inactive until email ownership is
verified.

## Governing Evidence

Read these before any task:

1. This file's `Binding Decisions`, `Core Security Invariants`, and
   `Locked Architect Decisions` sections.
2. `docs/continuation-prompts/CP-012-packet02-redline-apply-and-build.md`
3. `docs/research/PACKET-02-REMEDIATION-CONTRACT.md`
4. `docs/research/PACKET-02-VENDOR-REVIEW-1-RUN6-RESULT.md`
5. `docs/research/PACKET-02-VENDOR-REVIEW-1-RUN6-BUNDLE.md`
6. `docs/incidents/INCIDENT-P001-auth-security-exposure.md`
7. `docs/incidents/INCIDENT-P003-vendor-review-egress-gate.md`
8. The task file being executed

Historical references to unavailable CP-011/design-research files are
superseded by the Round 6 packet, remediation contract, and RUN6 PASS/GO
artifacts above. This packet supersedes the obsolete Packet 02 design and its
original task contents.

## Binding Decisions

- Invitations create a global IdP identity, not app membership.
- Registration is invite-only and email-bound by default.
- Invite tokens are opaque 256-bit values. Store only SHA-256 hashes.
- The `Invite` record stores only the token hash. A raw token needed for
  durable email delivery may exist only as short-lived authenticated
  ciphertext in an outbox row and must be erased after successful delivery or
  terminal failure.
- Tokens are expiring, revocable, single-use, and reuse-detectable.
- New users start `INACTIVE`; only verified email ownership activates them.
- Social JIT creation and silent email-based linking are forbidden.
- Existing linked accounts remain compatible, but new linking requires proof
  of the active session, a second factor, and the external provider.
- Invite redemption, inactive-user creation, and outbox insertion are one
  database transaction.
- Email delivery is performed by an idempotent retrying outbox worker.
- Cloudflare Turnstile and Upstash rate limits are layered controls.
- Admin invite operations require least privilege, recent Admin MFA Elevation
  (MFA-backed posture + recent-auth freshness), immutable audit events, and rate
  limits.
- Seed/bootstrap and future SDK paths must use explicit trusted creation
  services; direct production user creation is forbidden.
- Existing user IDs, OIDC subjects, linked providers, and relying-party
  contracts must remain stable.

## Explicit Non-Goals

- No `App`, `AppMembership`, or pairwise-subject migration.
- No public self-service registration.
- No trusted social-provider JIT for new users.
- No disposable-email package or remote blocklist. A valid email-bound invite
  makes this low-value and introduces false-positive and supply-chain risk.
- No SDK implementation.
- No claim that Turnstile alone prevents bots.

## Live Account-Creation Surface

| Path                         | Current deployed behavior                                            | Packet 02 outcome                                               |
| ---------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| First-party signup action    | Kill switch blocks production; otherwise creates user then sends OTP | Replace with atomic invite redemption                           |
| OAuth-oriented signup action | Duplicates first-party creation flow                                 | Route through the same registration service                     |
| Google/GitHub first sign-in  | Prisma adapter may create a user; dangerous email linking enabled    | Disable JIT and silent linking                                  |
| Account settings linking     | Provider sign-in can link by email                                   | Replace with explicit proof-bound linking                       |
| OTP verification             | Sets `emailVerified` and auto-creates JWT session                    | Also transition `INACTIVE -> ACTIVE` atomically                 |
| Seed/bootstrap               | Direct `user.upsert`                                                 | Development-only trusted creation with explicit `ACTIVE` status |
| Admin creation/invites       | No dedicated least-privilege flow                                    | Admin MFA Elevation-protected invite operations                 |
| Future SDK/API               | No common creation boundary                                          | Add one guarded creation service and tests forbidding bypass    |

## State Machines

### Invite

```text
ISSUED -> REDEEMED
   |-> REVOKED
   |-> EXPIRED (effective state derived from expiresAt)
```

Only `ISSUED`, `REDEEMED`, and `REVOKED` are persisted. `EXPIRED` is a derived
terminal state when an issued invite passes `expiresAt`; the service must never
reopen it. Redemption is a conditional database transition and never occurs on
page load.

### Account

```text
INACTIVE -> ACTIVE -> SUSPENDED -> DELETED
```

- New accounts are always `INACTIVE`.
- Email verification performs `INACTIVE -> ACTIVE`.
- Authentication, OAuth authorization, UserInfo, and session creation require
  `ACTIVE`.
- Existing users are backfilled to `ACTIVE` without changing IDs or subjects.

### Registration

```text
invite context
  -> admission checks
  -> atomic admission evidence + INACTIVE user + outbox row
  -> retrying email worker
  -> OTP verification
  -> ACTIVE user + new session
```

For invite-based registration, admission evidence includes the atomic
`ISSUED -> REDEEMED` transition. An allowlist match must be recorded as a
redacted audit event in the same transaction and must never create an
unreviewed second user-creation path.

## Core Security Invariants

1. No raw invite token is stored or logged.
2. A GET request or email scanner cannot consume an invite.
3. Exactly one concurrent redemption succeeds.
4. A failed user write leaves the invite usable; a committed user always has
   an outbox record.
5. Email-provider failure leaves a safe `INACTIVE` account and retryable work.
6. Invite delivery secrets are encrypted at rest, never logged, and erased
   after delivery completes or reaches terminal failure.
7. No account can authenticate or receive RP authorization while inactive,
   suspended, or deleted.
8. Social login cannot create a global user.
9. Linking never relies on email equality alone.
10. Admin invite issue/revoke actions require recent Admin MFA Elevation proof.
11. Public responses do not distinguish absent, expired, used, revoked,
    mismatched, or already-registered identities.
12. Raw email, tokens, OTPs, and secrets never enter logs or limiter keys.
13. Legacy sessions without a `sessionVersion` claim map to version `0` only
    while the database user is still at version `0`.
14. Every creation and activation path has a regression test.

### Locked Architect Decisions

These decisions are **DECIDED** and binding for this packet. They are not open
questions; do not reopen them. Per the redline audit, the underlying invariants
(hash-only storage `[RESEARCH-BACKED §4.4]`, `timingSafeEqual` lookup
`[RESEARCH-BACKED §4.4]`, enumeration-safe responses `[RESEARCH-BACKED §4.8]`)
are research-backed, while the transport and Admin MFA Elevation freshness-window
*mechanisms* below are `[ARCHITECT-DECISION]` hardening on which the canon is
silent — tag them
honestly downstream and never cite them as research-mandated.

- **DECISION 1 — invite-token transport: DECIDED = fragment/hybrid
  (off-GET + hash-only).** The emailed invite link carries the raw token
  **only** in the URL `#fragment` (`/invite#token=<raw>`); the fragment is never
  sent on the GET, so server logs, Referer, and email scanners never receive it.
  First-party client code on the accept page reads the fragment and immediately
  POSTs it to a **non-redeeming exchange endpoint**, then calls
  `history.replaceState` to strip the fragment from the address bar. The exchange
  endpoint is CSRF-protected, rate-limited (per-IP + per-invite-hash), and
  enumeration-safe; it does NOT redeem or consume the invite — it only verifies
  `sha256(token)` against an `ISSUED` invite and mints a short-lived **opaque
  registration-session reference**. The server stores **only** `sha256(token)`;
  the raw token is discarded after the exchange and is NEVER persisted, logged,
  or re-issued into the cookie. The registration-session cookie is
  `HttpOnly; Secure; SameSite=Strict; Path=/register; Max-Age <= 600s` and holds
  **only** a 256-bit CSPRNG `handle` (`base64url(crypto.randomBytes(32))`, never the raw
  token) that binds server-side to `{invite identity = sha256(token)/invite-id, normalized email,
  createdAt, single-use nonce}`. That server-side binding is the `RegistrationSession`
  row owned by TASK-016 (the row stores **only** `handleHash = sha256(handle)`; the cookie
  carries the raw `handle`, never the row's internal `id`/cuid, never the raw
  token, never a signed envelope or self-contained client-trusted blob); when under
  the global exchange-write budget (TASK-021), the exchange mints a row (`PENDING`
  for a known-good `ISSUED` invite, `DECOY` for any absent/expired/used/revoked/
  malformed token) and returns the same cookie/status/redirect for both; when the
  global exchange-write budget is exhausted it returns the SAME cookie/status/redirect
  but writes NO row (parity-preserving, no valid-vs-decoy or budget oracle) — so
  cookie possession is never admission. The GET never redeems, consumes, finally
  validates, or logs the token. Final redemption happens **only** on the
  `/register` POST, which re-runs CSRF + Turnstile `siteverify` + admission
  checks and performs the **atomic single-use** invite consume (compare-and-set
  on `ISSUED`) using the **server-resolved** invite (not a client-supplied
  token). No-JS tradeoff: the exchange requires JavaScript; a `<noscript>` notice
  states JS is required. TASK-018 emits a link consistent with this choice;
  TASK-027 owns the fragment->exchange hand-off and the side-effect-free GET.
  `[ARCHITECT-DECISION]` — canon is silent on transport; neither transport is
  research-mandated or research-refuted.

- **DECISION 2 — Admin MFA Elevation: DECIDED = MFA-backed posture +
  recent-auth freshness (NOT per-action email-OTP).** Admin invite
  issue/revoke/resend and trusted user creation require, enforced
  **server-side at the mutation boundary**: (1) explicit capability (RBAC
  least-privilege, e.g. `admin:invite:issue`, `admin:user:create`); (2) an
  ACTIVE admin session; (3) **MFA-backed posture** — MFA enrollment is a hard
  PRECONDITION of holding the admin capability (no admin identity without an
  enrolled second factor), so "MFA-backed" is non-vacuous. The enrolled factor is
  a REAL second factor recorded in the `AdminMfaFactor` registry (schema owned by
  TASK-016; enrollment + TOTP verification/assertion + the `lastStrongAuthAt` write
  owned by TASK-025) — not a bare marker column; `requireAdminElevation` issues a
  grant only when the identity has at least one `ACTIVE` `AdminMfaFactor` and the
  freshness window holds, otherwise admin mutations are effectively unavailable.
  (4) **recent-auth
  freshness** — re-auth within `ADMIN_ELEVATION_MAX_AGE_SECONDS = 300` seconds,
  computed from a server-trusted `lastStrongAuthAt` timestamp; (5) rate limits
  (per-admin-actor + per-IP/per-target); (6) an immutable append-only
  `AuditEvent`. The capability check, elevation check, and audit write commit in
  **ONE transaction** (TASK-025). The bespoke per-action email-OTP elevation
  cookie is **DROPPED/deferred**; a future TOTP/WebAuthn factor satisfies the
  same contract without changing admin-invite semantics. There is NO separate
  email-OTP challenge and NO separate signed/encrypted per-action elevation
  cookie; the rejection case is "missing/stale MFA elevation (absent enrolled
  factor or freshness older than 300s)". `[RESEARCH-BACKED §4.7 / §2 P-4]` for
  MFA+RBAC+audit; the freshness-window mechanism is `[ARCHITECT-DECISION]` and
  MUST NOT be cited as research-backed.

## Migration and Rollback

- Use an additive expand/backfill/contract migration.
- Add account status nullable, backfill existing users to `ACTIVE`, then make
  it non-null with default `INACTIVE`.
- Add invite, outbox, audit, linking-intent, and Admin MFA Elevation state
  without changing existing user IDs or OAuth relations.
- Test on a Neon branch before production.
- Set a migration `lock_timeout`.
- Keep the previous app compatible during the additive phase.
- Roll back application code before schema cleanup. Do not drop new tables in
  the first rollback window.

## Task Graph

`TASK-020` belongs to Packet 01 and is intentionally not reused. Task
numbering under this packet is intentionally **non-contiguous** (016–019,
021–029). A builder MUST NOT create or revive a `TASK-020` under Packet 02; any
`TASK-020` work is a Packet-01 concern and is **out of scope** here. Do not
"fill the gap."

The `Contract ✓` column tracks the **Contract conformance** gate (see below):
every task file must carry all six Per-Task Execution Contract elements before
its wave may proceed. `PENDING` until verified; flip to `yes` only after the
gate confirms the task file.

| Order | Task     | Concern                                                                         | Depends on         | Contract ✓ |
| ----: | -------- | ------------------------------------------------------------------------------- | ------------------ | ---------- |
|     1 | TASK-016 | Account/invite/outbox/audit schema and migration                                | Packet 01          | yes        |
|     2 | TASK-017 | Invite issuance, lookup, revocation, and reuse detection                        | 016                | yes        |
|     3 | TASK-021 | Shared configuration, Turnstile, admission policy, enumeration, and rate limits | Packet 01          | yes        |
|     4 | TASK-018 | Transactional outbox, encrypted delivery payloads, and worker                   | 016, 021           | yes        |
|     5 | TASK-019 | Atomic credentials registration for every allowed admission source              | 016, 017, 018, 021, 022 [^opts] | yes     |
|     6 | TASK-022 | Close social JIT creation and dangerous email linking                           | 016, 021           | yes        |
|     7 | TASK-023 | Explicit account linking and session invalidation                               | 022                | yes        |
|     8 | TASK-025 | Admin MFA Elevation                                                              | 016, 021           | yes        |
|     9 | TASK-024 | Seed/bootstrap and future creation-path guard                                   | 016, 019, 022, 025 | yes        |
|    10 | TASK-026 | Admin invite issue/revoke operations and audit                                  | 017, 021, 025      | yes        |
|    11 | TASK-027 | Invitation exchange (fragment->cookie hand-off per DECISION 1) and registration UX | 019, 021        | yes        |
|    12 | TASK-028 | Adversarial, concurrency, migration, and E2E proof                              | 016-027            | yes        |
|    13 | TASK-029 | Living docs, release, deploy, production verification                           | 028                | yes        |

[^opts]: **`options.ts` ownership transfer (TASK-022 -> TASK-019).** TASK-022
    owns `options.ts` (providers + `signIn`/`createUser`/`linkAccount`) for the
    social-JIT and silent-linking closure and, on completion, hands the file to
    TASK-019 for the non-`ACTIVE`-state auth guards. This is why `022` is in
    TASK-019's `Depends on` even though TASK-022 has the higher order number:
    the dependency is the file hand-off, not execution precedence. The two tasks
    **MUST NOT run concurrently against `options.ts`**; the Handoff section of
    TASK-022 is the authoritative release point. The underlying security facts
    (close social JIT; never silently merge classic+federated, §1 item 2 / §5.2)
    are `[RESEARCH-BACKED]`; this ownership/sequencing encoding is
    `[ORCHESTRATION]`.

Tasks are sequential unless their files are demonstrably disjoint. No two
agents may edit the same file set in parallel.

### Dependency Waves

```text
Wave 0: user approval + branch preflight
Wave 1: TASK-016 schema
Wave 2: TASK-017 invite service, TASK-021 shared config + admission controls
Wave 3: TASK-018 outbox, TASK-022 social closure
Wave 4: TASK-019 credentials, TASK-025 admin MFA elevation
Wave 5: TASK-023 linking, TASK-024 creation guard, TASK-026 admin invites,
        TASK-027 invitation exchange (fragment->cookie per DECISION 1) + UX
Wave 6: TASK-028 adversarial verification
Wave 7: TASK-029 docs, release, deploy, production proof
```

Tasks in the same wave may run concurrently only when their declared owned
files do not overlap. Any shared-file change requires explicit ownership
transfer and sequential integration.

## Per-Task Execution Contract

Every task file must be sufficient for a fresh builder context and must state:

- exact owned files or globs and shared files that are read-only;
- dependencies and whether parallel execution is permitted;
- a scope guard and forbidden changes;
- targeted tests plus the full project quality gate;
- incident triggers for unexpected test/build/security regressions;
- the packet-specific task-report path and handoff evidence.

The builder must stop when live code contradicts the task contract. The
architect resolves the contract; the builder does not improvise auth
architecture.

### Contract conformance gate (BLOCKING — before Wave 2)

This gate runs after Wave 1 (TASK-016) and **before any Wave 2 task starts**.
No Wave 2+ task may begin until it passes.

- Confirm every task file `TASK-016`..`TASK-029` carries all six Per-Task
  Execution Contract elements (owned files/globs; dependencies + parallel
  permission; scope guard + forbidden changes; targeted tests + full quality
  gate; incident triggers; task-report path + handoff evidence).
- **Re-verify `TASK-026`, `TASK-027`, `TASK-028`, and `TASK-029` explicitly** —
  these were authored after the contract section and are the most likely to
  drift.
- Record one checkbox row per task in the build-packet report and flip that
  task's `Contract ✓` column in the Task Graph from `PENDING` to `yes`.
- A task whose file is missing any element is **BLOCKED**; the architect repairs
  the task file before its wave proceeds. This gate is canon-silent
  packet-authoring discipline `[PACKET-AUTHORING]`, not a research requirement.

## Release Blockers

- Migration tested on a Neon branch and deploy/rollback commands recorded.
- All account creation paths are enumerated by an automated source/test guard.
- Double redemption creates exactly one user and one redeemed invite.
- Invite email delivery persists no plaintext token; encrypted delivery
  material is erased after completion or terminal failure.
- Social first sign-in creates no user.
- Silent linking is impossible.
- Inactive users cannot sign in, authorize OAuth, call UserInfo, or receive an
  auto-login session.
- Turnstile replay and invalid action/hostname are rejected server-side.
- Per-IP, per-email/account, per-invite, and admin limits are independent.
- Email outage leaves retryable outbox work and no active account.
- Admin issue/revoke fails without Admin MFA Elevation proof (missing/stale MFA
  elevation: absent enrolled factor or freshness older than 300s).
- Enumeration parity is tested for registration, invite redemption, login,
  password reset, and OTP.
- Full quality and security gates pass.
- Preview and production golden paths are recorded.
- A different model family completes a read-only security review before
  implementation approval and again before release.

## Full Quality Gate

```bash
pnpm install --frozen-lockfile
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level=high
pnpm audit --prod --audit-level=high
```

## Definition of Done

Packet 02 is complete only after code, migration, tests, task reports, packet
report, living documentation, version `1.9.0`, PR documentation, deployment,
production verification, and the Packet 02 portion of Incident P001 are all
updated with evidence.
