// src/app/api/debug-session/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';

export async function GET() {
  const session = await getServerSession(authOptions);
  return NextResponse.json(session);
}