# Public Route Group

- `page.tsx` is the email-first credentials/social authentication entry.
- It reads OAuth callback context and can open directly in signup mode.
- Authenticated users are redirected or shown account-state UI as appropriate.
- Accessible without authentication.
- Session state is hydrated through the root layout/providers.
