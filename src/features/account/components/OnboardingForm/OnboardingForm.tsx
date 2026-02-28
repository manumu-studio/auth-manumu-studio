// Onboarding form used to collect required profile data after OAuth sign-in.
'use client';

import InputField from '@/components/ui/InputField';
import NextButton from '@/components/ui/NextButton';
import { COUNTRIES } from '@/lib/data/countries';
import type { OnboardingFormProps } from './OnboardingForm.types';
import { useOnboardingForm } from './useOnboardingForm';

export default function OnboardingForm({ userName }: OnboardingFormProps) {
  const {
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
  } = useOnboardingForm(userName);

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      {formError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {formError}
        </div>
      )}

      <InputField
        id="displayName"
        name="displayName"
        type="text"
        label="Display name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={fieldErrors.displayName}
        disabled={isPending}
        required
      />

      <div className="mb-6">
        <label
          htmlFor="country"
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Country <span aria-label="required">*</span>
        </label>
        <select
          id="country"
          name="country"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          disabled={isPending}
          required
          aria-invalid={fieldErrors.country ? 'true' : 'false'}
          className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
        >
          <option value="">Select your country</option>
          {COUNTRIES.map((countryOption) => (
            <option key={countryOption.code} value={countryOption.code}>
              {countryOption.name}
            </option>
          ))}
        </select>
        {fieldErrors.country && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{fieldErrors.country}</p>
        )}
      </div>

      <InputField
        id="nickname"
        name="nickname"
        type="text"
        label="Nickname (optional)"
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        error={fieldErrors.nickname}
        disabled={isPending}
      />

      <NextButton type="submit" isLoading={isPending} disabled={isPending}>
        Continue to dashboard
      </NextButton>
    </form>
  );
}
