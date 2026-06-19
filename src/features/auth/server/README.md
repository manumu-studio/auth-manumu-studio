# Auth Server Layer

- `options.ts` — NextAuth providers, callbacks, credentials verification.
- `createSessionToken.ts` — post-OTP NextAuth session creation.
- `actions/` — signup, sign-in, reset request, reset consumption.
- `providers/` — Google and GitHub provider factories.
- `verify/` — OTP token lifecycle.
- `reset/` — password-reset lifecycle and templates.
- `oauth/` — OAuth/OIDC authorization-server implementation.
