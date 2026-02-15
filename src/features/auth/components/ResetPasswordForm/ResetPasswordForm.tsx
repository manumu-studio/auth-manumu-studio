// Reset password form — validates token + sets new password
'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import InputField from '@/components/ui/InputField';
import NextButton from '@/components/ui/NextButton';
import { resetPassword } from '@/features/auth/server/actions';
import { resetPasswordSchema } from '@/lib/validation/reset';
import type { ResetPasswordFormProps } from './ResetPasswordForm.types';

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      if (flat.formErrors?.length) {
        setError(flat.formErrors[0] ?? 'Invalid input');
      }
      const errors: Record<string, string> = {};
      Object.entries(flat.fieldErrors).forEach(([key, messages]) => {
        if (messages?.[0]) errors[key] = messages[0];
      });
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);

      const res = await resetPassword(formData);

      if (!res.ok) {
        setError(res.errors?.formErrors?.[0] ?? 'Unable to reset password.');
        return;
      }

      // Success — redirect to success page
      router.push('/reset-password/success');
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Reset password">
      <InputField
        ref={passwordRef}
        id="new-password"
        name="password"
        type="password"
        label="New password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
          setFieldErrors({});
        }}
        error={fieldErrors['password']}
        disabled={isPending}
        autoComplete="new-password"
        required
      />

      <InputField
        ref={confirmRef}
        id="confirm-password"
        name="confirmPassword"
        type="password"
        label="Confirm password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setError(null);
          setFieldErrors({});
        }}
        error={fieldErrors['confirmPassword']}
        disabled={isPending}
        autoComplete="new-password"
        required
      />

      {/* Form-level error (server errors, expired tokens, etc.) */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400" role="alert">{error}</p>
      )}

      <div className="space-y-2">
        <NextButton
          type="submit"
          isLoading={isPending}
          disabled={!password || !confirmPassword || isPending}
        >
          Reset password
        </NextButton>
      </div>
    </form>
  );
}
