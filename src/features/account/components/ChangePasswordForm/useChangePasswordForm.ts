// Custom hook for ChangePasswordForm state and submission
'use client';

import { useState, useTransition } from 'react';
import { changePassword } from '@/features/account/server/actions/changePassword';

export function useChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      formData.set('currentPassword', currentPassword);
      formData.set('newPassword', newPassword);
      formData.set('confirmPassword', confirmPassword);

      const result = await changePassword(formData);

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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return {
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    fieldErrors,
    formError,
    success,
    isPending,
    handleSubmit,
  };
}
