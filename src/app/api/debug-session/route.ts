// src/app/api/debug-session/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';

/**
 * Debug endpoint for viewing current session data.
 * 
 * ⚠️ SECURITY: This endpoint is disabled in production to prevent
 * session data exposure. Only available in development mode.
 * 
 * @returns {Promise<NextResponse>} Session data or 404 in production
 */
export async function GET() {
  // Block access in production to prevent session exposure
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  return NextResponse.json(session);
}