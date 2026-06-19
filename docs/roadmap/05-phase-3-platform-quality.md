# Phase 3 — Identity Platform Model

**Status:** Deferred until Phases 0–2 pass verification

## Goal

Support multiple applications without duplicating credentials or implicitly
granting every user access to every app.

## Scope

- Promote the OAuth client registry into an `App` model.
- Add `AppMembership(userId, appId, role, metadata)`.
- Add `AppSubject(userId, appId, sub)`.
- Backfill existing LSA, Career Kit, and FixtureLog relationships.
- Preserve public `sub` for existing clients.
- Default new clients to pairwise subjects.
- Add an admin app/client management surface.

## Deferred Security Work

- Refresh-token rotation.
- Token revocation and introspection.
- Key rotation.
- Session idle and absolute timeouts.
- MFA and recovery.
- Security/audit event log.
