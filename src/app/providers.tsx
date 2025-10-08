'use client';

import type { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export default function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <ChakraProvider>{children}</ChakraProvider>
    </SessionProvider>
  );
}


