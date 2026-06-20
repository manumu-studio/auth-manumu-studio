// prisma/seed.ts — development-only database seed. Refuses to run in production.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { hashClientSecret } from '../src/features/auth/server/oauth/clientRegistry';

// ─── Safety guards (run before any Prisma construction) ──────────────────────

if (process.env.NODE_ENV === 'production') {
  console.error('[seed] Refused: NODE_ENV is production.');
  process.exit(1);
}

if (process.env.SEED_CONFIRMATION !== 'DEVELOPMENT_ONLY') {
  console.error('[seed] Refused: set SEED_CONFIRMATION=DEVELOPMENT_ONLY to proceed.');
  process.exit(1);
}

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const userPassword = process.env.SEED_USER_PASSWORD;
const oauthClientSecret = process.env.SEED_OAUTH_CLIENT_SECRET;

if (!adminPassword || adminPassword.length < 16) {
  console.error('[seed] Refused: SEED_ADMIN_PASSWORD must be at least 16 characters.');
  process.exit(1);
}

if (!userPassword || userPassword.length < 16) {
  console.error('[seed] Refused: SEED_USER_PASSWORD must be at least 16 characters.');
  process.exit(1);
}

if (!oauthClientSecret || oauthClientSecret.length < 32) {
  console.error('[seed] Refused: SEED_OAUTH_CLIENT_SECRET must be at least 32 characters.');
  process.exit(1);
}

// ─── Seed ────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function main() {
  const adminPassHash = await bcrypt.hash(adminPassword, 10);
  const userPassHash = await bcrypt.hash(userPassword, 10);

  await prisma.user.upsert({
    where: { email: 'admin@demo.io' },
    update: {
      role: 'ADMIN',
      origin: 'FIRST_PARTY',
      profile: {
        upsert: {
          create: { country: 'GB', city: 'London', address: '221B Baker Street' },
          update: { country: 'GB', city: 'London', address: '221B Baker Street' },
        },
      },
    },
    create: {
      email: 'admin@demo.io',
      name: 'Admin Demo',
      role: 'ADMIN',
      origin: 'FIRST_PARTY',
      password: adminPassHash,
      profile: {
        create: { country: 'GB', city: 'London', address: '221B Baker Street' },
      },
    },
  });
  console.log('[seed] Created/updated user: admin@demo.io');

  await prisma.user.upsert({
    where: { email: 'user@demo.io' },
    update: {},
    create: {
      email: 'user@demo.io',
      name: 'User Demo',
      role: 'USER',
      origin: 'FIRST_PARTY',
      password: userPassHash,
      profile: {
        create: { country: 'US', city: 'Miami', address: '1 Ocean Dr' },
      },
    },
  });
  console.log('[seed] Created/updated user: user@demo.io');

  const petsgramClientId = 'petsgram-web';
  const existingClient = await prisma.oAuthClient.findUnique({
    where: { clientId: petsgramClientId },
    select: { clientId: true },
  });

  if (!existingClient) {
    await prisma.oAuthClient.create({
      data: {
        clientId: petsgramClientId,
        clientSecretHash: hashClientSecret(oauthClientSecret),
        name: 'Petsgram Web',
        description: 'Petsgram frontend application',
        redirectUris: ['http://localhost:5173/auth/callback'],
        allowedOrigins: ['http://localhost:5173'],
        scopes: ['openid', 'email', 'profile'],
      },
    });
    console.log(`[seed] Created OAuth client: ${petsgramClientId}`);
  } else {
    console.log(`[seed] OAuth client already exists: ${petsgramClientId}`);
  }

  console.log('[seed] Done.');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
