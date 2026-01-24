-- CreateTable
CREATE TABLE "public"."oauth_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "redirectUris" TEXT[] NOT NULL,
    "allowedOrigins" TEXT[] NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clients_clientId_key" ON "public"."oauth_clients"("clientId");

-- CreateIndex
CREATE INDEX "oauth_clients_clientId_idx" ON "public"."oauth_clients"("clientId");

-- AddForeignKey
ALTER TABLE "public"."oauth_clients" ADD CONSTRAINT "oauth_clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
