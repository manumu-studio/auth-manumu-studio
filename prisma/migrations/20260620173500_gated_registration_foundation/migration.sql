-- Packet 02 gated registration foundation
SET lock_timeout = '5s';

CREATE EXTENSION IF NOT EXISTS "citext";

DO $$
BEGIN
  IF EXISTS (
    SELECT lower("email")
    FROM "public"."users"
    GROUP BY lower("email")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot convert users.email to citext: case-insensitive duplicates exist';
  END IF;
END;
$$;

CREATE TYPE "public"."AccountStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "public"."InviteStatus" AS ENUM ('ISSUED', 'REDEEMED', 'REVOKED');
CREATE TYPE "public"."OutboxEmailStatus" AS ENUM ('PENDING', 'CLAIMED', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "public"."RegistrationSessionStatus" AS ENUM ('PENDING', 'CONSUMED', 'DECOY');
CREATE TYPE "public"."AdminMfaKind" AS ENUM ('TOTP', 'WEBAUTHN');
CREATE TYPE "public"."AdminMfaStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

ALTER TABLE "public"."users"
  ALTER COLUMN "email" TYPE CITEXT USING "email"::CITEXT,
  ADD COLUMN "status" "public"."AccountStatus",
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "hasPasswordCredential" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaEnrolledAt" TIMESTAMP(3),
  ADD COLUMN "lastStrongAuthAt" TIMESTAMP(3),
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "public"."users"
SET "passwordHash" = "password"
WHERE "passwordHash" IS NULL
  AND "password" IS NOT NULL;

UPDATE "public"."users"
SET "hasPasswordCredential" = true
WHERE "passwordHash" IS NOT NULL;

UPDATE "public"."users"
SET "status" = 'ACTIVE'
WHERE "status" IS NULL;

ALTER TABLE "public"."users"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'INACTIVE';

ALTER TABLE "public"."users"
  ADD CONSTRAINT "chk_user_active_credential_binding"
  CHECK (NOT (
    "status" = 'ACTIVE'
    AND "hasPasswordCredential" = true
    AND "passwordHash" IS NULL
  ));

CREATE TABLE "public"."invites" (
  "id" TEXT NOT NULL,
  "tokenHash" BYTEA NOT NULL,
  "normalizedEmail" CITEXT,
  "status" "public"."InviteStatus" NOT NULL DEFAULT 'ISSUED',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "issuerUserId" TEXT NOT NULL,
  "redeemedByUserId" TEXT,
  "redeemedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_invite_redeemed_binding" CHECK (
    (
      "status" = 'REDEEMED'
      AND "redeemedAt" IS NOT NULL
      AND "redeemedByUserId" IS NOT NULL
    )
    OR (
      "status" <> 'REDEEMED'
      AND "redeemedAt" IS NULL
      AND "redeemedByUserId" IS NULL
    )
  ),
  CONSTRAINT "chk_invite_revoked_binding" CHECK (
    (
      "status" = 'REVOKED'
      AND "revokedAt" IS NOT NULL
    )
    OR (
      "status" <> 'REVOKED'
      AND "revokedAt" IS NULL
    )
  )
);

CREATE TABLE "public"."outbox_emails" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateId" TEXT,
  "recipientUserId" TEXT,
  "dedupId" TEXT NOT NULL,
  "status" "public"."OutboxEmailStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "ciphertext" BYTEA,
  "keyVersion" INTEGER,
  "clearedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "outbox_emails_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_outbox_email_ciphertext_clear" CHECK (
    ("clearedAt" IS NULL OR ("ciphertext" IS NULL AND "keyVersion" IS NULL))
    AND ("ciphertext" IS NULL OR "keyVersion" IS NOT NULL)
  )
);

CREATE TABLE "public"."audit_events" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "targetUserId" TEXT,
  "requestId" TEXT,
  "supportId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."account_link_intents" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT,
  "nonceHash" BYTEA NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "account_link_intents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."registration_sessions" (
  "id" TEXT NOT NULL,
  "handleHash" BYTEA NOT NULL,
  "inviteTokenHash" BYTEA,
  "inviteId" TEXT,
  "normalizedEmail" CITEXT,
  "nonce" BYTEA NOT NULL,
  "status" "public"."RegistrationSessionStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "registration_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_registration_sessions_consumption" CHECK (
    (
      "status" = 'CONSUMED'
      AND "consumedAt" IS NOT NULL
    )
    OR (
      "status" <> 'CONSUMED'
      AND "consumedAt" IS NULL
    )
  )
);

CREATE TABLE "public"."admin_mfa_factors" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "public"."AdminMfaKind" NOT NULL,
  "status" "public"."AdminMfaStatus" NOT NULL DEFAULT 'PENDING',
  "secretCipher" BYTEA NOT NULL,
  "keyVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),

  CONSTRAINT "admin_mfa_factors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invites_tokenHash_key" ON "public"."invites"("tokenHash");
CREATE INDEX "invites_status_expiresAt_idx" ON "public"."invites"("status", "expiresAt");
CREATE INDEX "invites_issuerUserId_idx" ON "public"."invites"("issuerUserId");
CREATE INDEX "invites_redeemedByUserId_idx" ON "public"."invites"("redeemedByUserId");
CREATE INDEX "invites_normalizedEmail_idx" ON "public"."invites"("normalizedEmail");

CREATE UNIQUE INDEX "outbox_emails_dedupId_key" ON "public"."outbox_emails"("dedupId");
CREATE INDEX "outbox_emails_status_availableAt_idx" ON "public"."outbox_emails"("status", "availableAt");
CREATE INDEX "outbox_emails_recipientUserId_idx" ON "public"."outbox_emails"("recipientUserId");
CREATE INDEX "outbox_emails_eventType_aggregateId_idx" ON "public"."outbox_emails"("eventType", "aggregateId");

CREATE INDEX "audit_events_actorUserId_createdAt_idx" ON "public"."audit_events"("actorUserId", "createdAt");
CREATE INDEX "audit_events_targetType_targetId_idx" ON "public"."audit_events"("targetType", "targetId");
CREATE INDEX "audit_events_targetUserId_idx" ON "public"."audit_events"("targetUserId");
CREATE INDEX "audit_events_requestId_idx" ON "public"."audit_events"("requestId");

CREATE UNIQUE INDEX "account_link_intents_nonceHash_key" ON "public"."account_link_intents"("nonceHash");
CREATE INDEX "account_link_intents_userId_provider_expiresAt_idx" ON "public"."account_link_intents"("userId", "provider", "expiresAt");
CREATE INDEX "account_link_intents_expiresAt_idx" ON "public"."account_link_intents"("expiresAt");

CREATE UNIQUE INDEX "registration_sessions_handleHash_key" ON "public"."registration_sessions"("handleHash");
CREATE INDEX "registration_sessions_expiresAt_idx" ON "public"."registration_sessions"("expiresAt");
CREATE INDEX "registration_sessions_inviteTokenHash_idx" ON "public"."registration_sessions"("inviteTokenHash");

CREATE INDEX "admin_mfa_factors_userId_status_idx" ON "public"."admin_mfa_factors"("userId", "status");
CREATE INDEX "admin_mfa_factors_kind_status_idx" ON "public"."admin_mfa_factors"("kind", "status");

ALTER TABLE "public"."invites"
  ADD CONSTRAINT "invites_issuerUserId_fkey"
  FOREIGN KEY ("issuerUserId") REFERENCES "public"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."invites"
  ADD CONSTRAINT "invites_redeemedByUserId_fkey"
  FOREIGN KEY ("redeemedByUserId") REFERENCES "public"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."outbox_emails"
  ADD CONSTRAINT "outbox_emails_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."audit_events"
  ADD CONSTRAINT "audit_events_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."audit_events"
  ADD CONSTRAINT "audit_events_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."account_link_intents"
  ADD CONSTRAINT "account_link_intents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."registration_sessions"
  ADD CONSTRAINT "registration_sessions_inviteId_fkey"
  FOREIGN KEY ("inviteId") REFERENCES "public"."invites"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."admin_mfa_factors"
  ADD CONSTRAINT "admin_mfa_factors_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "public"."raise_audit_event_immutable"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_events_immutable"
BEFORE UPDATE OR DELETE ON "public"."audit_events"
FOR EACH ROW EXECUTE FUNCTION "public"."raise_audit_event_immutable"();
