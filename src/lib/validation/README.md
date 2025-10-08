# Validation (Zod)

Runtime validation + inferred TS types for forms and actions.

## Files
- `fields.ts` – shared field rules (email, password, names, etc.)
- `signin.ts` – SignInSchema
- `signup.ts` – SignUpSchema (+ type `SignUpInput` via `z.infer`)

## Usage
```ts
import { SignUpSchema } from '@/lib/validation/signup';

const parsed = SignUpSchema.safeParse(raw);
if (!parsed.success) {
  // use parsed.error.flatten() → { formErrors, fieldErrors }
} else {
  const data = parsed.data; // fully typed
}