
import type { ReactNode } from 'react';
import '@/styles/globals.scss';
import Providers from './providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';

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
