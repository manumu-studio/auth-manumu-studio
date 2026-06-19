# API Documentation

`openapi.yaml` describes the current application-owned HTTP contract:

- OTP verification and resend;
- OAuth authorization and token exchange;
- OIDC discovery, JWKS, UserInfo, and logout.

NextAuth's generated `/api/auth/*` routes are framework-owned and intentionally
excluded.

Update the contract whenever a route, input, response, status code, scope, or
authentication requirement changes.
