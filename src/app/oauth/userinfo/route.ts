// src/app/oauth/userinfo/route.ts
// OIDC UserInfo endpoint — returns user claims based on access token scopes.
// Applies per-IP and per-token (SHA-256 fingerprint) rate limits.
import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/features/auth/server/oauth/jwt";
import { getUserClaims } from "@/features/auth/server/oauth/claims";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import {
  userinfoEndpointIpKey,
  userinfoEndpointTokenKey,
} from "@/features/auth/server/oauth/rateLimitKeys";

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "invalid_token" },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
  );
}

export async function GET(req: Request) {
  // Step 1: derive client IP and apply per-IP rate limit
  const ip = getClientIp(req.headers);
  const ipResult = await rateLimit(userinfoEndpointIpKey(ip), "oauth-userinfo-ip");
  if (!ipResult.success) {
    const retryAfter = Math.max(1, Math.ceil((ipResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { "Retry-After": String(retryAfter), "WWW-Authenticate": "Bearer" } }
    );
  }

  // Step 2: parse Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorizedResponse();
  }
  const token = authHeader.slice("Bearer ".length).trim();

  // Step 3-4: per-token rate limit keyed by SHA-256 fingerprint only
  const tokenResult = await rateLimit(userinfoEndpointTokenKey(token), "oauth-userinfo-token");
  if (!tokenResult.success) {
    const retryAfter = Math.max(1, Math.ceil((tokenResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { "Retry-After": String(retryAfter), "WWW-Authenticate": "Bearer" } }
    );
  }

  // Step 5: verify token and fetch claims
  const payload = verifyAccessToken(token);
  if (!payload) {
    return unauthorizedResponse();
  }

  const scopes = payload.scope.split(/\s+/).filter(Boolean);
  const claims = await getUserClaims(payload.sub, scopes);
  if (!claims) {
    return unauthorizedResponse();
  }

  return NextResponse.json(claims);
}
