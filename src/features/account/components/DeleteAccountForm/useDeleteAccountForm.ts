// Custom hook for DeleteAccountForm state and submission
'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { deleteAccount } from '@/features/account/server/actions/deleteAccount';

export function useDeleteAccountForm(userEmail: string) {
  const [isPending, startTransition] = useTransition();
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isConfirmed = emailConfirmation.trim().toLowerCase() === userEmail.trim().toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    if (!isConfirmed) {
      setFieldErrors({ emailConfirmation: 'Email does not match your account' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('emailConfirmation', emailConfirmation);

      const result = await deleteAccount(formData);

      if (!result.ok) {
        if (result.errors.formErrors?.[0]) setFormError(result.errors.formErrors[0]);
        if (result.errors.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(result.errors.fieldErrors)) {
            if (messages?.[0]) mapped[key] = messages[0];
          }
          setFieldErrors(mapped);
        }
        return;
      }

      // Account deleted — sign out and redirect
      await signOut({ callbackUrl: '/' });
    });
  };

  return {
    emailConfirmation,
    setEmailConfirmation,
    fieldErrors,
    formError,
    isConfirmed,
    isPending,
    handleSubmit,
  };
}
