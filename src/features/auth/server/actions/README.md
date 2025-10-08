# Auth Server Actions
All server actions exposed to the client.

- `signin.ts` → validates credentials and logs in user.
- `signup.ts` → registers new users (calls `registerUser`).
- Exports are re-exported via `index.ts`.