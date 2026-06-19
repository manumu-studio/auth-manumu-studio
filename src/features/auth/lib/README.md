# Auth Libraries

- `email/provider.ts` sends verification email through Resend.

The development fallback logs email contents only when `NODE_ENV` is
`development`. Production requires Resend configuration.
