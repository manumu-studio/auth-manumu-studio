// Password change form with current, new, and confirm password fields
'use client';

import InputField from '@/components/ui/InputField';
import NextButton from '@/components/ui/NextButton';
import { useChangePasswordForm } from './useChangePasswordForm';
import type { ChangePasswordFormProps } from './ChangePasswordForm.types';

export default function ChangePasswordForm({ hasPassword }: ChangePasswordFormProps) {
  const {
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    fieldErrors,
    formError,
    success,
    isPending,
    handleSubmit,
  } = useChangePasswordForm();

  // Show message if user has no password (OAuth-only account)
  if (!hasPassword) {
    return (
      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
        Your account uses social login and doesn&apos;t have a password set.
        Password management is not available for OAuth-only accounts.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      {/* Form error banner */}
      {formError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm mb-4">
          {formError}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm mb-4">
          Password changed successfully
        </div>
      )}

      {/* Password fields */}
      <InputField
        id="currentPassword"
        name="currentPassword"
        type="password"
        label="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        error={fieldErrors.currentPassword}
        disabled={isPending}
        autoComplete="current-password"
        required
      />

      <InputField
        id="newPassword"
        name="newPassword"
        type="password"
        label="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={fieldErrors.newPassword}
        disabled={isPending}
        autoComplete="new-password"
        required
      />

      <InputField
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword}
        disabled={isPending}
        autoComplete="new-password"
        required
      />

      {/* Submit button */}
      <NextButton type="submit" isLoading={isPending} disabled={isPending}>
        Change password
      </NextButton>
    </form>
  );
}
