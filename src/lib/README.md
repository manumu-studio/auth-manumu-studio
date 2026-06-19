# Shared Library

- `prisma.ts` — Prisma client singleton.
- `env.ts` — Zod-validated runtime environment.
- `rateLimit.ts` — Upstash/in-memory rate limiting and request-IP helpers.
- `data/countries.ts` — country data for account/profile forms.
- `validation/` — Zod schemas for auth and account boundaries.

There is no generic `utils/` bucket. Shared modules should have a named
responsibility.
