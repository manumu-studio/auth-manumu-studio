// Wraps the Prisma adapter with Packet 02 social JIT/linking hard stops.
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";

const SOCIAL_JIT_DISABLED_ERROR = "SOCIAL_JIT_DISABLED";
const SOCIAL_LINKING_REQUIRES_EXPLICIT_INTENT_ERROR = "SOCIAL_LINKING_REQUIRES_EXPLICIT_INTENT";

const denySocialJitCreateUser: NonNullable<Adapter["createUser"]> = async () => {
  throw new Error(SOCIAL_JIT_DISABLED_ERROR);
};

const denySilentSocialLinking: NonNullable<Adapter["linkAccount"]> = async () => {
  throw new Error(SOCIAL_LINKING_REQUIRES_EXPLICIT_INTENT_ERROR);
};

export function createGatedSocialAdapter(baseAdapter: Adapter): Adapter {
  return {
    ...baseAdapter,
    createUser: denySocialJitCreateUser,
    linkAccount: denySilentSocialLinking,
  };
}

export function gatedPrismaAdapter(prismaClient: Parameters<typeof PrismaAdapter>[0]): Adapter {
  return createGatedSocialAdapter(PrismaAdapter(prismaClient));
}
