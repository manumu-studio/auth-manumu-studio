# Third‑Party Auth Milestone (Target State)

**Testing policy:** Every new `feature/*` or `fix/*` branch should include tests for the new work. These tests are recommended for confidence but are not required to merge into `main` unless explicitly called out.

Completion criteria for “third‑party auth” readiness:
- Client registration with redirect URI allowlist
- OAuth2/OIDC authorization + token endpoints
- PKCE for SPAs
- JWKS + OIDC discovery
- External token handoff to Petsgram-compatible flow
