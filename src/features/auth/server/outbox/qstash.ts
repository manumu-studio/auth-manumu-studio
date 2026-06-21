// QStash publish contract helpers for transactional email outbox messages.
import { createHash } from "node:crypto";
import { buildOutboxWorkerMessage, type OutboxWorkerMessage } from "./message";

export type OutboxDedupInput = {
  eventType: string;
  subjectId: string;
  keyVersion?: number | string | null;
  contentVersion: string;
};

export type QStashPublishRequest = {
  url: string;
  init: {
    method: "POST";
    headers: {
      Authorization: string;
      "Content-Type": "application/json";
      "Upstash-Deduplication-Id": string;
    };
    body: string;
  };
};

export type QStashPublishRequestInput = {
  qstashBaseUrl: string;
  qstashToken: string;
  destinationUrl: string;
  dedupId: string;
  message: OutboxWorkerMessage;
};

export function buildOutboxDedupId(input: OutboxDedupInput): string {
  const keyVersion = input.keyVersion === null || input.keyVersion === undefined
    ? "none"
    : String(input.keyVersion);
  const material = [input.eventType, input.subjectId, keyVersion, input.contentVersion].join("\u001f");
  return createHash("sha256").update(material, "utf8").digest("hex");
}

export function buildQStashPublishRequest(input: QStashPublishRequestInput): QStashPublishRequest {
  const message = buildOutboxWorkerMessage(input.message);
  return {
    url: `${input.qstashBaseUrl.replace(/\/$/, "")}/v2/publish/${input.destinationUrl}`,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.qstashToken}`,
        "Content-Type": "application/json",
        "Upstash-Deduplication-Id": input.dedupId,
      },
      body: JSON.stringify(message),
    },
  };
}
