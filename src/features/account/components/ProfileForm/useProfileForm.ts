// Custom hook for ProfileForm state management and submission
'use client';

import { useState, useTransition } from 'react';
import { updateProfile } from '@/features/account/server/actions/updateProfile';
import type { UserProfileData } from '@/features/account/server/queries/getUserProfile';

export function useProfileForm(user: UserProfileData) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(user.name ?? '');
  const [country, setCountry] = useState(user.profile?.country ?? '');
  const [city, setCity] = useState(user.profile?.city ?? '');
  const [address, setAddress] = useState(user.profile?.address ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setSuccess(false);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('name', name);
      if (country) formData.set('country', country);
      if (city) formData.set('city', city);
      if (address) formData.set('address', address);

      const result = await updateProfile(formData);

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

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return {
    name, setName,
    country, setCountry,
    city, setCity,
    address, setAddress,
    fieldErrors,
    formError,
    success,
    isPending,
    handleSubmit,
  };
}
