-- CreateEnum
CREATE TYPE "public"."AccountOrigin" AS ENUM ('FIRST_PARTY', 'PETSGRAM');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN "origin" "public"."AccountOrigin" NOT NULL DEFAULT 'FIRST_PARTY';
