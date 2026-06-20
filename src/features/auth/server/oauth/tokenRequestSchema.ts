// src/features/auth/server/oauth/tokenRequestSchema.ts
// Zod schema and parser for OAuth 2.0 token endpoint request bodies.
// Accepts both JSON and form-encoded submissions; malformed input yields
// an invalid_request result without throwing.
import { z } from "zod";

export const TokenRequestSchema = z.object({
  grant_type: z.string().optional(),
  code: z.string().optional(),
  redirect_uri: z.string().optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  code_verifier: z.string().optional(),
});

export type TokenRequestBody = z.infer<typeof TokenRequestSchema>;

export type TokenRequestParseResult =
  | { ok: true; body: TokenRequestBody }
  | { ok: false; error: "invalid_request"; description: string };

export async function parseTokenRequest(req: Request): Promise<TokenRequestParseResult> {
  const contentType = req.headers.get("content-type") ?? "";
  let raw: unknown;

  try {
    if (contentType.includes("application/json")) {
      raw = await req.json();
    } else {
      // form-encoded (application/x-www-form-urlencoded or multipart)
      const form = await req.formData();
      raw = {
        grant_type: form.get("grant_type")?.toString(),
        code: form.get("code")?.toString(),
        redirect_uri: form.get("redirect_uri")?.toString(),
        client_id: form.get("client_id")?.toString(),
        client_secret: form.get("client_secret")?.toString(),
        code_verifier: form.get("code_verifier")?.toString(),
      };
    }
  } catch {
    return { ok: false, error: "invalid_request", description: "Malformed request body." };
  }

  const result = TokenRequestSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: "invalid_request", description: "Invalid request parameters." };
  }

  return { ok: true, body: result.data };
}
