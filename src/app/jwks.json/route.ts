import { NextResponse } from "next/server";
import { getJwks } from "@/features/auth/server/oauth/jwt";

export async function GET() {
  try {
    return NextResponse.json(getJwks(), {
      headers: {
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error) {
    console.error("JWKS unavailable", error);
    return NextResponse.json({ error: "jwks_unavailable" }, { status: 500 });
  }
}
