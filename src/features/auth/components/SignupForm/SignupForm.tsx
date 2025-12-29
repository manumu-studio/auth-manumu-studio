// src/features/auth/components/SignupForm/SignupForm.tsx
"use client";
import { useRef, useState, useTransition, Fragment } from "react";
import {
  Box, Button, VStack, Input, FormControl, FormLabel, HStack, useToast, Text,
} from "@chakra-ui/react";
import type { FormEvent } from "react";
import { registerUser } from "../../server/actions";
import type { SignupFormProps } from "./SignupForm.types";
import VerifyBanner from "../VerifyBanner";
import ResendLink from "../ResendLink";

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    const form = e.currentTarget;
    const emailEl = form.elements.namedItem("email") as HTMLInputElement | null;
    if (emailEl) emailEl.value = emailEl.value.trim().toLowerCase();

    const fd = new FormData(form);

    startTransition(async () => {
      const res = await registerUser(fd);
      if (!res.ok) {
        setError(res.errors?.formErrors?.[0] ?? "Could not create account");
        return;
      }

      // Expecting: res.meta?.requiresEmailVerification + res.meta?.email (from server action)
      const email = (res as any).meta?.email as string | undefined;

      toast.closeAll();
      toast({
        title: "Account created",
        description: "Check your inbox and verify your email to continue.",
        status: "info",
        position: "top",
      });

      setPendingVerifyEmail(email ?? null);
      formRef.current?.reset();
      onSuccess?.();
    });
  }

  return (
    <Fragment>
      {pendingVerifyEmail && (
        <div style={{ marginBottom: 12 }}>
          <VerifyBanner email={pendingVerifyEmail} />
          <ResendLink email={pendingVerifyEmail} />
        </div>
      )}

      <Box as="form" ref={formRef} onSubmit={onSubmit} noValidate>
        <VStack spacing={4} align="stretch" opacity={isPending ? 0.8 : 1}>
          <HStack spacing={4}>
            <FormControl>
              <FormLabel>First name</FormLabel>
              <Input name="firstname" autoComplete="given-name" isRequired isDisabled={isPending} />
            </FormControl>
            <FormControl>
              <FormLabel>Last name</FormLabel>
              <Input name="lastname" autoComplete="family-name" isRequired isDisabled={isPending} />
            </FormControl>
          </HStack>

          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input name="email" type="email" autoComplete="email" isRequired isDisabled={isPending} />
          </FormControl>

          <HStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input name="password" type="password" autoComplete="new-password" minLength={8} isRequired isDisabled={isPending} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Confirm password</FormLabel>
              <Input name="repeatpassword" type="password" autoComplete="new-password" minLength={8} isRequired isDisabled={isPending} />
            </FormControl>
          </HStack>

          <HStack spacing={4}>
            <FormControl>
              <FormLabel>Country (ISO-2)</FormLabel>
              <Input
                name="country"
                placeholder="GB"
                maxLength={2}
                textTransform="uppercase"
                onBlur={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}
                autoComplete="country"
                isDisabled={isPending}
              />
            </FormControl>
            <FormControl>
              <FormLabel>City</FormLabel>
              <Input name="city" autoComplete="address-level2" isDisabled={isPending} />
            </FormControl>
          </HStack>

          <FormControl>
            <FormLabel>Address</FormLabel>
            <Input name="address" autoComplete="street-address" isDisabled={isPending} />
          </FormControl>

          {error && (
            <Text color="red.500" fontSize="sm" aria-live="polite">
              {error}
            </Text>
          )}

          <Button type="submit" isLoading={isPending} colorScheme="blue" w="full" loadingText="Creating account">
            Create account
          </Button>
        </VStack>
      </Box>
    </Fragment>
  );
}