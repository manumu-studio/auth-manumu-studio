import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// No-op: lets every request continue
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// (Optional) only run on specific paths later
export const config = {
  // matcher: ['/dashboard/:path*', '/api/:path*'],
};