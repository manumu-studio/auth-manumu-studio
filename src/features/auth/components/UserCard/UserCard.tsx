'use client';

import { useSession, signOut } from 'next-auth/react';
import {
  Avatar, Badge, Box, Button, Card, CardBody, CardHeader,
  HStack, Heading, Stack, Text, VStack,
} from '@chakra-ui/react';

export default function UserCard() {
  const { data, status } = useSession();
  if (status !== 'authenticated' || !data?.user) return null;

  const name = data.user.name ?? '';
  const email = data.user.email ?? '';
  // Role is available via NextAuth type augmentation
  const role = data.user.role ?? 'USER';
  const initials = name
    ? name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
    : (email[0]?.toUpperCase() ?? 'U');

  async function onSignOut() {
    await signOut({ callbackUrl: '/' });
  }

  return (
    <Card maxW="lg" w="full" shadow="md" borderRadius="2xl">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <Heading size="md">Your account</Heading>
          <Badge colorScheme="blue" variant="subtle">{role}</Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} align="center">
          <Avatar name={name || email} size="lg" bg="blue.500">
            {!name && !email ? initials : null}
          </Avatar>
          <VStack align="start" spacing={0} flex="1">
            <Heading size="sm">{name || email}</Heading>
            {email && (
              <Text color="gray.600" fontSize="sm" noOfLines={1}>
                {email}
              </Text>
            )}
          </VStack>
        </Stack>

        <Box mt={6}>
          <Button onClick={onSignOut} w="full" colorScheme="gray" variant="outline">
            Sign out
          </Button>
        </Box>
      </CardBody>
    </Card>
  );
}

