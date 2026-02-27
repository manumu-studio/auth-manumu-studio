// OAuth 2.0 user claims builder - maps user data to standard claims based on granted scopes

import { prisma } from '@/lib/prisma';

export type UserClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string | null;
  picture?: string | null;
};

export async function getUserClaims(
  userId: string,
  scopes: string[]
): Promise<UserClaims | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      name: true,
      image: true,
    },
  });

  if (!user) {
    return null;
  }

  const claims: UserClaims = {
    sub: user.id,
  };

  if (scopes.includes('email')) {
    claims.email = user.email;
    claims.email_verified = user.emailVerified !== null;
  }

  if (scopes.includes('profile')) {
    claims.name = user.name ?? undefined;
    claims.picture = user.image ?? undefined;
  }

  return claims;
}
