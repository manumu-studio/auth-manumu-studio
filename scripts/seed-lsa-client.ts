// Seed script: Register Learning Speaking App as an OAuth client
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LSA_CLIENT = {
  name: "Learning Speaking App",
  description: "AI-powered speaking practice tool for English learners",
  redirectUris: [
    "http://localhost:3000/api/auth/callback/manumustudio",
  ],
  allowedOrigins: [
    "http://localhost:3000",
  ],
  scopes: ["openid", "email", "profile"],
};

async function main() {
  const clientSecret = crypto.randomBytes(32).toString("base64url");
  const clientSecretHash = crypto
    .createHash("sha256")
    .update(clientSecret)
    .digest("hex");

  const record = await prisma.oAuthClient.create({
    data: {
      clientId: crypto.randomUUID(),
      clientSecretHash,
      name: LSA_CLIENT.name,
      description: LSA_CLIENT.description,
      redirectUris: LSA_CLIENT.redirectUris,
      allowedOrigins: LSA_CLIENT.allowedOrigins,
      scopes: LSA_CLIENT.scopes,
    },
    select: { clientId: true },
  });

  console.log("\n✅ OAuth client registered successfully!\n");
  console.log("Add these to your LSA project's .env.local:");
  console.log("─".repeat(50));
  console.log(`AUTH_CLIENT_ID=${record.clientId}`);
  console.log(`AUTH_CLIENT_SECRET=${clientSecret}`);
  console.log("─".repeat(50));
  console.log("\n⚠️  Save the secret now — it cannot be retrieved later.\n");
}

main()
  .catch((error) => {
    console.error("❌ Failed to create OAuth client:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
