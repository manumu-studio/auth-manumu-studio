# Phase 1: Auth Server Foundations (Core)

This phase turns ManuMu Auth into a real authorization server. Complete in order.

---

## 10) `feature/oauth-client-registry`

**Goal:** Register third‑party apps with strict redirect/origin controls.

**Scope:**
- New `OAuthClient` model (client_id, client_secret, redirect_uris, allowed_origins, scopes)
- Admin‑only creation flow (seed or internal tool)

**Tasks:**
- Add Prisma model + migration
- Add server utilities to create/rotate client secrets
- Validate redirect URIs with strict allowlist
- Document client registration in `docs/SECURITY.md`

**Acceptance Criteria:**
- Clients can be created and stored securely
- Secret rotation supported
- Redirect URIs validated and enforced

---

## 11) `feature/oauth-authorization-endpoint`

**Goal:** Implement `/oauth/authorize` with consent + redirect validation.

**Scope:**
- Authorization Code flow entry point
- Consent screen for scopes (`openid`, `email`, `profile`)
- PKCE challenge storage

**Tasks:**
- Build `/oauth/authorize` route
- Validate `client_id`, `redirect_uri`, `scope`, `state`
- Store auth codes with expiry and PKCE challenge

**Acceptance Criteria:**
- Invalid client/redirect rejected
- Consent required for new scopes
- Auth code expires and is one‑time use

---

## 12) `feature/oauth-token-endpoint`

**Goal:** Implement `/oauth/token` to exchange code for tokens.

**Scope:**
- Validate code + PKCE verifier
- Issue access token (JWT) + optional refresh token

**Tasks:**
- Build `/oauth/token` route
- Verify code + client secret (or PKCE for public clients)
- Sign JWT with `iss`, `aud`, `sub`, `exp`, `scope`

**Acceptance Criteria:**
- Token exchange works for public + confidential clients
- Invalid verifier/client rejected
- JWT claims match spec

---

## 13) `feature/jwks-and-oidc-discovery`

**Goal:** Expose verification metadata for third‑party APIs.

**Scope:**
- `/jwks.json`
- `/.well-known/openid-configuration`

**Tasks:**
- Add JWKS endpoint (public keys)
- Add OIDC discovery doc with issuer + endpoints
- Update docs with verifier instructions

**Acceptance Criteria:**
- JWT can be verified via JWKS
- Discovery doc loads with correct issuer + endpoints
