# Auth Types

`next-auth.d.ts` augments:

- `Session.user` with `id` and optional `role`;
- `User` with `id` and optional `role`;
- JWT with `uid` and optional `role`.

Roles are constrained to `USER | ADMIN`.
