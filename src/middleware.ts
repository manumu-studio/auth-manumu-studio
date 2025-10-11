import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  // pass-through; do nothing
  return NextResponse.next();
}

// (optional) Only run on real app paths, not Next internals
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};