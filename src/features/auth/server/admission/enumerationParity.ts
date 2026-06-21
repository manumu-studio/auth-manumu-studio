// src/features/auth/server/admission/enumerationParity.ts
// Builds one reusable generic failure envelope and timing pad for admission rejections.
import { randomUUID } from "node:crypto";
import type { GenericAdmissionFailure } from "./admission.types";

const GENERIC_ADMISSION_MESSAGE = "Unable to complete this request.";
const DEFAULT_ADMISSION_FAILURE_STATUS = 403;
const DEFAULT_MIN_DURATION_MS = 250;

export function createGenericAdmissionFailure(
  status = DEFAULT_ADMISSION_FAILURE_STATUS
): GenericAdmissionFailure {
  return {
    ok: false,
    status,
    body: {
      ok: false,
      message: GENERIC_ADMISSION_MESSAGE,
      supportId: `admission_${randomUUID()}`,
    },
  };
}

export async function padAdmissionTiming(
  startedAtMs: number,
  minDurationMs = DEFAULT_MIN_DURATION_MS
): Promise<void> {
  const remainingMs = minDurationMs - (Date.now() - startedAtMs);
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }
}
