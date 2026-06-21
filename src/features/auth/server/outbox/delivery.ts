// Delivery handlers for claimed transactional outbox rows.
import type {
  ClaimableOutboxEmailRow,
  OutboxProcessorDeps,
  RecipientUser,
  SendVerificationEmailArgs,
} from "./types";
import type { SendInvitationEmailArgs } from "./invitationEmail";

function buildVerificationEmailArgs(
  recipient: RecipientUser,
  code: string
): SendVerificationEmailArgs {
  if (recipient.name) {
    return { to: recipient.email, code, name: recipient.name };
  }
  return { to: recipient.email, code };
}

function buildInvitationEmailArgs(
  recipient: RecipientUser,
  inviteUrl: string
): SendInvitationEmailArgs {
  if (recipient.name) {
    return { to: recipient.email, inviteUrl, name: recipient.name };
  }
  return { to: recipient.email, inviteUrl };
}

async function findRecipient(
  row: ClaimableOutboxEmailRow,
  deps: OutboxProcessorDeps
): Promise<RecipientUser> {
  if (!row.recipientUserId) throw new Error("OUTBOX_RECIPIENT_NOT_FOUND");

  const recipient = await deps.db.findRecipientUser(row.recipientUserId);
  if (!recipient) throw new Error("OUTBOX_RECIPIENT_NOT_FOUND");
  return recipient;
}

async function deliverVerificationEmail(
  row: ClaimableOutboxEmailRow,
  deps: OutboxProcessorDeps
): Promise<void> {
  const recipient = await findRecipient(row, deps);
  const token = await deps.createVerificationToken(recipient.email);
  await deps.sendVerificationEmail(buildVerificationEmailArgs(recipient, token.code));
}

async function deliverInvitationEmail(
  row: ClaimableOutboxEmailRow,
  deps: OutboxProcessorDeps
): Promise<void> {
  if (!row.inviteCiphertext) throw new Error("INVITE_DELIVERY_DECRYPT_FAILED");

  const recipient = await findRecipient(row, deps);
  const rawToken = deps.decryptInviteToken(row.inviteCiphertext, row.keyVersion);
  const inviteUrl = deps.buildInviteAcceptUrl(rawToken);
  await deps.sendInvitationEmail(buildInvitationEmailArgs(recipient, inviteUrl));
}

export async function deliverClaimedOutboxEmail(
  row: ClaimableOutboxEmailRow,
  deps: OutboxProcessorDeps
): Promise<void> {
  switch (row.eventType) {
    case "EMAIL_VERIFICATION":
      await deliverVerificationEmail(row, deps);
      return;
    case "INVITATION_DELIVERY":
      await deliverInvitationEmail(row, deps);
      return;
    default:
      throw new Error("OUTBOX_UNSUPPORTED_EVENT_TYPE");
  }
}
