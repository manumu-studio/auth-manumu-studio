// src/features/auth/server/invites/reuseAlert.ts
// Reuse alert hook for invite replay detection.
import type { InviteReuseAlertHandler } from "./invite.types";

let inviteReuseAlertHandler: InviteReuseAlertHandler = () => undefined;

export function setInviteReuseAlertHandler(handler: InviteReuseAlertHandler): () => void {
  const previousHandler = inviteReuseAlertHandler;
  inviteReuseAlertHandler = handler;

  return () => {
    inviteReuseAlertHandler = previousHandler;
  };
}

export async function alertInviteReuse(inviteId: string): Promise<void> {
  await inviteReuseAlertHandler({ inviteId, status: "REDEEMED" });
}
