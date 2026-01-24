import { NextResponse } from "next/server";
import { resolveIssuer, resolveIssuerEndpoint } from "@/features/auth/server/oauth/issuer";

export async function GET() {
  const issuer = resolveIssuer().replace(/\/$/, "");
  const discovery = {
    issuer,
    jwks_uri: resolveIssuerEndpoint("/jwks.json"),
    authorization_endpoint: resolveIssuerEndpoint("/oauth/authorize"),
    token_endpoint: resolveIssuerEndpoint("/oauth/token"),
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["plain", "S256"],
  };

  return NextResponse.json(discovery, {
    headers: {
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
