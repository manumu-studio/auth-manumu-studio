'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import type { SignInFormProps } from './SignInForm.types';
import styles from './SignInForm.module.scss';

import {
  Box,
  Button,
  VStack,
  Input,
  FormControl,
  FormLabel,
  Text,
  useToast,
} from '@chakra-ui/react';
import { signIn, useSession } from 'next-auth/react';

function getInputValue(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name) as HTMLInputElement | null;
  return el?.value?.toString() ?? '';
}

export default function SignInForm({
  onSuccess,
  onError,
  className,
  defaultValues,
}: SignInFormProps) {
  const toast = useToast();
  const { update } = useSession();

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setError(null);

    const form = e.currentTarget;

    // normalize email input before submit
    const emailEl = form.elements.namedItem('email') as HTMLInputElement | null;
    if (emailEl && emailEl.value) {
      emailEl.value = emailEl.value.trim().toLowerCase();
    }

    startTransition(async () => {
      const email = getInputValue(form, 'email');
      const password = getInputValue(form, 'password');

      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        const msg = 'Invalid credentials';
        setError(msg);
        onError?.(msg);
        return;
      }

      // refresh session context without reloading the page
      await update();

      toast.closeAll();
      toast({
        title: 'Signed in',
        description: 'Welcome back!',
        status: 'success',
        position: 'top',
      });

      formRef.current?.reset();
      onSuccess?.();
    });
  }

  return (
    <Box
      as="form"
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className={[styles.root, className].filter(Boolean).join(' ')}
    >
      <VStack spacing={4} align="stretch" opacity={isPending ? 0.8 : 1}>
        <FormControl isRequired>
          <FormLabel htmlFor="email">Email</FormLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaultValues?.email ?? ''}
            isRequired
            isDisabled={isPending}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel htmlFor="password">Password</FormLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            isRequired
            isDisabled={isPending}
          />
        </FormControl>

        {error && (
          <Text color="red.500" fontSize="sm" aria-live="polite">
            {error}
          </Text>
        )}

        <Box className={styles.actions}>
          <Button
            type="submit"
            isLoading={isPending}
            colorScheme="blue"
            w="full"
            loadingText="Signing in"
          >
            Sign in
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}