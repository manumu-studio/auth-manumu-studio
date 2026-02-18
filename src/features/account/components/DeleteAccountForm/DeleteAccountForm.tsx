// Account deletion form with email confirmation
'use client';

import InputField from '@/components/ui/InputField';
import { useDeleteAccountForm } from './useDeleteAccountForm';
import type { DeleteAccountFormProps } from './DeleteAccountForm.types';

export default function DeleteAccountForm({ userEmail }: DeleteAccountFormProps) {
  const {
    emailConfirmation,
    setEmailConfirmation,
    fieldErrors,
    formError,
    isConfirmed,
    isPending,
    handleSubmit,
  } = useDeleteAccountForm(userEmail);

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
          Danger Zone
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400">
          This action is permanent and cannot be undone. All your data, including your
          profile, connected accounts, and sessions will be permanently deleted.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-1">
        {/* Form error banner */}
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm mb-4">
            {formError}
          </div>
        )}

        {/* Email confirmation */}
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          Type <span className="font-mono font-semibold">{userEmail}</span> to confirm deletion:
        </p>

        <InputField
          id="emailConfirmation"
          name="emailConfirmation"
          type="email"
          label="Confirm your email"
          value={emailConfirmation}
          onChange={(e) => setEmailConfirmation(e.target.value)}
          error={fieldErrors.emailConfirmation}
          disabled={isPending}
          autoComplete="email"
          required
        />

        {/* Delete button — red styling */}
        <button
          type="submit"
          disabled={!isConfirmed || isPending}
          className="w-full py-2.5 px-3.5 text-sm font-medium rounded bg-red-600 hover:bg-red-700 active:bg-red-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          {isPending ? 'Deleting account...' : 'Permanently delete my account'}
        </button>
      </form>
    </div>
  );
}
