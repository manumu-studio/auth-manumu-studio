// src/features/auth/server/oauth/actions/signup.ts
// Compatibility export for the shared invite-gated registration action.
"use server";

import type { ActionResult } from "./types";
import { registerUser as registerWithInviteAction } from "@/features/auth/server/registration/registerAction";

export async function registerUser(formData: FormData): Promise<ActionResult> {
  return registerWithInviteAction(formData);
}