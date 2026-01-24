import 'dotenv/config';
 
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateClientSecret, hashClientSecret } from '../src/features/auth/server/oauth/clientRegistry';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const userPass = await bcrypt.hash('user123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@demo.io' },
    update: {
      role: 'ADMIN',
      origin: 'FIRST_PARTY',
      profile: {
        upsert: {
          create: {
            country: 'GB',
            city: 'London',
            address: '221B Baker Street',
          },
          update: {
            country: 'GB',
            city: 'London',
            address: '221B Baker Street',
          },
        },
      },
    },
    create: {
      email: 'admin@demo.io',
      name: 'Admin Demo',
      role: 'ADMIN',
      origin: 'FIRST_PARTY',
      password: adminPass,
      profile: {
        create: { country: 'GB', city: 'London', address: '221B Baker Street' },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@demo.io' },
    update: {},
    create: {
      email: 'user@demo.io',
      name: 'User Demo',
      role: 'USER',
      origin: 'FIRST_PARTY',
      password: userPass,
      profile: {
        create: { country: 'US', city: 'Miami', address: '1 Ocean Dr' },
      },
    },
  });

  const petsgramClientId = 'petsgram-web';
  const existingClient = await prisma.oAuthClient.findUnique({
    where: { clientId: petsgramClientId },
    select: { clientId: true },
  });
  if (!existingClient) {
    const clientSecret = generateClientSecret();
    await prisma.oAuthClient.create({
      data: {
        clientId: petsgramClientId,
        clientSecretHash: hashClientSecret(clientSecret),
        name: 'Petsgram Web',
        description: 'Petsgram frontend application',
        redirectUris: ['http://localhost:5173/auth/callback'],
        allowedOrigins: ['http://localhost:5173'],
        scopes: ['openid', 'email', 'profile'],
      },
    });
    console.log(`[Petsgram] client_id=${petsgramClientId} client_secret=${clientSecret}`);
  }

  console.log('Seeded admin@demo.io / admin123 and user@demo.io / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });