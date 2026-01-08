export type ActionResult =
  | { ok: true; meta?: { requiresEmailVerification?: boolean; email?: string } }
  | { ok: false; errors: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
