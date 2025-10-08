// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/features/auth/server/options';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };