import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const AUTH_CODE_TTL_MINUTES = 10;

type AuthorizationCodeInput = {
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
};

export type AuthorizationCodeResult = {
  code: string;
  expiresAt: Date;
};

function generateAuthorizationCode(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createAuthorizationCode(
  input: AuthorizationCodeInput
): Promise<AuthorizationCodeResult> {
  const code = generateAuthorizationCode();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MINUTES * 60 * 1000);

  await prisma.oAuthAuthorizationCode.create({
    data: {
      code,
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      scopes: input.scopes,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      expiresAt,
    },
  });

  return { code, expiresAt };
}
