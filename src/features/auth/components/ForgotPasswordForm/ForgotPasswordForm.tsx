// Forgot password form — collects email and sends reset link
'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import InputField from '@/components/ui/InputField';
import NextButton from '@/components/ui/NextButton';
import { requestPasswordReset } from '@/features/auth/server/actions';
import { requestResetSchema } from '@/lib/validation/reset';
import type { ForgotPasswordFormProps } from './ForgotPasswordForm.types';

export default function ForgotPasswordForm(_props: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const parsed = requestResetSchema.safeParse({ email });
    if (!parsed.success) {
      setError('Please enter a valid email address');
      emailRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email.trim().toLowerCase());

      const res = await requestPasswordReset(formData);

      if (!res.ok) {
        setError(res.errors?.formErrors?.[0] ?? 'Something went wrong.');
        return;
      }

      // Always show success (prevents email enumeration)
      setSuccess(true);
    });
  };

  // Success state — show confirmation message
  if (success) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          If an account exists for <strong>{email}</strong>, we sent a reset link.
          Check your inbox and spam folder.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Request password reset">
      <InputField
        ref={emailRef}
        id="reset-email"
        name="email"
        type="email"
        label="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(null);
        }}
        error={error ?? undefined}
        disabled={isPending}
        autoComplete="email"
        required
      />

      <div className="space-y-2">
        <NextButton
          type="submit"
          isLoading={isPending}
          disabled={!email || isPending}
        >
          Send reset link
        </NextButton>

        <NextButton
          type="button"
          variant="secondary"
          className="backButtonDark"
          disabled={isPending}
        >
          <Link href="/" className="block w-full">
            Back to sign in
          </Link>
        </NextButton>
      </div>
    </form>
  );
}
