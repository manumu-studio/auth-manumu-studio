// src/features/auth/server/admission/admission.types.ts
// Shared admission decision types for public and admin auth boundaries.
import type { HeaderSource } from "@/lib/rateLimit";

export type GenericAdmissionFailure = {
  ok: false;
  status: number;
  body: {
    ok: false;
    message: string;
    supportId: string;
  };
};

export type AdmissionDecision = { ok: true } | GenericAdmissionFailure;

export type CsrfValidationInput = {
  headers: HeaderSource;
  expectedOrigin: string;
  sessionToken: string | null;
  submittedToken: string | null;
};
