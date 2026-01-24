import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";

  // Baseline security headers for auth endpoints and public pages
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https:",
      isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      isDev ? "connect-src 'self' https: ws:" : "connect-src 'self' https:",
      "font-src 'self' data:",
    ].join("; "),
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Only set HSTS in production (HTTPS required)
  if (process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

// (optional) Only run on real app paths, not Next internals
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};