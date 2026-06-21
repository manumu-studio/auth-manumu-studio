// Orchestrates claim, delivery, and state transitions for outbox messages.
import { createDefaultOutboxProcessorDeps } from "./deps";
import { deliverClaimedOutboxEmail } from "./delivery";
import type { OutboxWorkerMessage } from "./message";
import {
  claimDueOutboxEmail,
  finalizeOutboxEmailSent,
  recordOutboxEmailFailure,
} from "./state";
import type { OutboxProcessResult, OutboxProcessorDeps } from "./types";

export async function processOutboxEmailMessage(
  message: OutboxWorkerMessage,
  deps: OutboxProcessorDeps = createDefaultOutboxProcessorDeps()
): Promise<OutboxProcessResult> {
  const claim = await claimDueOutboxEmail(message, deps);
  if (!claim) return { ok: true, outcome: "skipped" };

  try {
    await deliverClaimedOutboxEmail(claim.row, deps);
    const finalized = await finalizeOutboxEmailSent(claim.row.id, claim.claimToken, deps);
    return { ok: true, outcome: finalized ? "sent" : "stale" };
  } catch (error) {
    const terminal = await recordOutboxEmailFailure(claim.row, claim.claimToken, error, deps);
    return { ok: true, outcome: terminal ? "failed" : "retry" };
  }
}
