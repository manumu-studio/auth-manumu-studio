// Custom hook for onboarding form state and submission handling.
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { completeOnboarding } from '@/features/account/server/actions/completeOnboarding';

export function useOnboardingForm(initialUserName: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initialUserName);
  const [country, setCountry] = useState('');
  const [nickname, setNickname] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('displayName', displayName);
      formData.set('country', country);
      if (nickname.trim()) {
        formData.set('nickname', nickname);
      }

      const result = await completeOnboarding(formData);

      if (!result.ok) {
        if (result.errors.formErrors?.[0]) {
          setFormError(result.errors.formErrors[0]);
        }

        if (result.errors.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(result.errors.fieldErrors)) {
            if (messages?.[0]) {
              mapped[key] = messages[0];
            }
          }
          setFieldErrors(mapped);
        }

        return;
      }

      router.push('/dashboard');
      router.refresh();
    });
  };

  return {
    displayName,
    setDisplayName,
    country,
    setCountry,
    nickname,
    setNickname,
    fieldErrors,
    formError,
    isPending,
    handleSubmit,
  };
}
