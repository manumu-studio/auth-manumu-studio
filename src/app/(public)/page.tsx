'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useDisclosure, Button, VStack, Heading, HStack, Container } from '@chakra-ui/react';
import AuthModal from '@/features/auth/components/AuthModal';
import UserCard  from '@/features/auth/components/UserCard';

export default function HomePage() {
  const { status } = useSession();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [initialTab, setInitialTab] = useState<'login' | 'signup'>('login');

  const openLogin = () => { setInitialTab('login'); onOpen(); };
  const openSignup = () => { setInitialTab('signup'); onOpen(); };

  const isAuthed = status === 'authenticated';

  return (
    <Container maxW="container.md" py={12}>
      {!isAuthed ? (
        <>
          <VStack minH="50vh" align="center" justify="center" spacing={6}>
            <Heading size="lg" textAlign="center">
              Welcome to M2 Auth & Profiles
            </Heading>
            <HStack spacing={3}>
              <Button size="lg" onClick={openLogin}>Sign in</Button>
              <Button size="lg" colorScheme="blue" onClick={openSignup}>Sign up</Button>
            </HStack>
          </VStack>

          <AuthModal
            isOpen={isOpen}
            onCloseAction={onClose}
            initialTab={initialTab}
          />
        </>
      ) : (
        <VStack minH="50vh" align="center" justify="center" spacing={6}>
          <Heading size="lg" textAlign="center">Welcome back</Heading>
          <UserCard />
        </VStack>
      )}
    </Container>
  );
}