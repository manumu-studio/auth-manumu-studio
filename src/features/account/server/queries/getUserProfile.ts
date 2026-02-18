// Server query to fetch complete user profile data for the dashboard
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { prisma } from '@/lib/prisma';

export interface UserProfileData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  hasPassword: boolean;
  profile: {
    country: string | null;
    city: string | null;
    address: string | null;
  } | null;
  connectedProviders: Array<{
    provider: string;
    providerAccountId: string;
  }>;
}

export async function getUserProfile(): Promise<UserProfileData | null> {
  // Get authenticated session
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  // Fetch user with profile and OAuth accounts
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      accounts: {
        select: {
          provider: true,
          providerAccountId: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Map to profile data structure
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: session.user.role,
    hasPassword: !!user.password,
    profile: user.profile,
    connectedProviders: user.accounts
      .filter((account) => account.provider === 'google' || account.provider === 'github')
      .map((account) => ({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      })),
  };
}
