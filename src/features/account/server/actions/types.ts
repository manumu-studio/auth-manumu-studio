// Action result type for account management operations
export type AccountActionResult =
  | { ok: true }
  | { ok: false; errors: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
