-- Packet 02 gated registration foundation rollback
SET lock_timeout = '5s';

DROP TRIGGER IF EXISTS "audit_events_immutable" ON "public"."audit_events";
DROP FUNCTION IF EXISTS "public"."raise_audit_event_immutable"();

DROP TABLE IF EXISTS "public"."admin_mfa_factors";
DROP TABLE IF EXISTS "public"."registration_sessions";
DROP TABLE IF EXISTS "public"."account_link_intents";
DROP TABLE IF EXISTS "public"."audit_events";
DROP TABLE IF EXISTS "public"."outbox_emails";
DROP TABLE IF EXISTS "public"."invites";

ALTER TABLE "public"."users" DROP CONSTRAINT IF EXISTS "chk_user_active_credential_binding";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "sessionVersion";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "lastStrongAuthAt";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "mfaEnrolledAt";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "hasPasswordCredential";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "status";
ALTER TABLE "public"."users" ALTER COLUMN "email" TYPE TEXT USING "email"::TEXT;

DROP TYPE IF EXISTS "public"."AdminMfaStatus";
DROP TYPE IF EXISTS "public"."AdminMfaKind";
DROP TYPE IF EXISTS "public"."RegistrationSessionStatus";
DROP TYPE IF EXISTS "public"."OutboxEmailStatus";
DROP TYPE IF EXISTS "public"."InviteStatus";
DROP TYPE IF EXISTS "public"."AccountStatus";
