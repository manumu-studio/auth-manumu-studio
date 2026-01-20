# Phase 1: Auth Server Foundations (Core)

4. `feature/oauth-client-registry`
   - Client apps with `client_id`, `client_secret`, allowed `redirect_uris`, allowed `origins`

5. `feature/oauth-authorization-endpoint`
   - `/oauth/authorize` with redirect validation + consent

6. `feature/oauth-token-endpoint`
   - `/oauth/token` with code exchange + PKCE

7. `feature/jwks-and-oidc-discovery`
   - `/jwks.json` + `/.well-known/openid-configuration`
