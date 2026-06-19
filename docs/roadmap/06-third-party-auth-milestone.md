# Phase 4 — Redirect-Based SDK

**Status:** Deferred

## Goal

Publish a small, stable client package after the IdP contract and security
baseline are proven.

## Intended Surface

- `AuthProvider`
- `SignInButton`
- `SignOutButton`
- `UserButton`
- server-side callback/session helpers
- issuer/discovery/JWKS configuration

## Constraints

- Authorization Code + PKCE.
- Publishable configuration only in browser code.
- Client secrets remain server-side.
- Hosted redirect or popup; no embedded credential collection.
- Compatibility tests against supported Next.js/React versions.
- Semantic releases and migration notes.

## Not Included Initially

- Clerk-style embedded FAPI infrastructure.
- Dynamic client registration.
- Enterprise organization/SCIM features.
- Public productization before internal applications prove the contract.
