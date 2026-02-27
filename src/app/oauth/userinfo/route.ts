// OIDC UserInfo endpoint — returns user claims based on access token scopes
import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/features/auth/server/oauth/jwt";
import { getUserClaims } from "@/features/auth/server/oauth/claims";

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "invalid_token" },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
  );
}

export async function GET(req: Request) {
  // Extract Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorizedResponse();
  }

  const token = authHeader.slice("Bearer ".length).trim();

  // Verify access token signature and expiration
  const payload = verifyAccessToken(token);
  if (!payload) {
    return unauthorizedResponse();
  }

  // Parse scopes and fetch user claims
  const scopes = payload.scope.split(/\s+/).filter(Boolean);
  const claims = await getUserClaims(payload.sub, scopes);
  if (!claims) {
    return unauthorizedResponse();
  }

  return NextResponse.json(claims);
}
