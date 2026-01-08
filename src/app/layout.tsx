
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '@/styles/globals.scss';
import Providers from './providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';

export const metadata: Metadata = {
  title: 'ManuMu Studio - Authentication',
  description: 'Production-ready authentication starter with Next.js, NextAuth.js, Prisma, and PostgreSQL',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/favicon-128x128.png', sizes: '128x128', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/favicon-128x128.png', sizes: '128x128', type: 'image/png' },
    ],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
