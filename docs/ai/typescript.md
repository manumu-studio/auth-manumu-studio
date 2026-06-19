# TypeScript Rules

This project uses strict TypeScript and Zod boundaries. New packets should
raise the floor without mixing broad cleanup into unrelated behavior changes.

## Local Standards

- No `any` in production code.
- Avoid `as` assertions except `as const`; prefer Zod, type guards, or
  discriminated unions.
- Validate all external data boundaries with Zod: request JSON, form data,
  URL params, environment variables, and OAuth/token payloads.
- Use explicit `| null` where null is possible.
- Prefer union types over enums in application code.
- Keep files under the project complexity targets when touching them.

## Known Cleanup Targets

- Some legacy tests still use `any` and assertions.
- Some runtime JSON parsing uses type assertions instead of schemas.
- `tsconfig.json` does not yet include every strict flag from the latest
  project standard.
- Several UI components contain manual SVGs and local type assertions.

Treat these as dedicated quality packets unless they are directly related to
the feature being changed.

