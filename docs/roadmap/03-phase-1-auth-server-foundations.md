# Phase 1 — Gated Private IdP

**Status:** Planned after Phase 0
**Branch:** `feat/gated-registration`

## Goal

Remove unrestricted public signup and make account creation an intentional,
auditable action.

## Scope

- Single-use expiring invite tokens stored as hashes.
- Email/address allowlists.
- Admin-issued invites and approval flow.
- Atomic invite redemption and user creation.
- Cloudflare Turnstile on public registration surfaces.
- Disposable-email blocking.
- Per-IP and per-email abuse limits.
- Enumeration-safe responses.

## Completion Gates

- No account can be created without the configured gate.
- Invite reuse and expiry tests.
- Bot-defense and rate-limit tests.
- Migration and rollback notes.
- Full living-document synchronization.
