// Profile editing form with fields for name, country, city, and address
'use client';

import InputField from '@/components/ui/InputField';
import NextButton from '@/components/ui/NextButton';
import { useProfileForm } from './useProfileForm';
import type { ProfileFormProps } from './ProfileForm.types';

export default function ProfileForm({ user }: ProfileFormProps) {
  const {
    name, setName,
    country, setCountry,
    city, setCity,
    address, setAddress,
    fieldErrors,
    formError,
    success,
    isPending,
    handleSubmit,
  } = useProfileForm(user);

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
          Profile updated successfully
        </div>
      )}

      {/* Email (read-only display) */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Email
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-200">{user.email}</p>
      </div>

      {/* Editable fields */}
      <InputField
        id="name"
        name="name"
        type="text"
        label="Display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        disabled={isPending}
        required
      />

      <InputField
        id="country"
        name="country"
        type="text"
        label="Country code (e.g. US)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        error={fieldErrors.country}
        disabled={isPending}
      />

      <InputField
        id="city"
        name="city"
        type="text"
        label="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        error={fieldErrors.city}
        disabled={isPending}
      />

      <InputField
        id="address"
        name="address"
        type="text"
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        error={fieldErrors.address}
        disabled={isPending}
      />

      {/* Submit button */}
      <NextButton type="submit" isLoading={isPending} disabled={isPending}>
        Save changes
      </NextButton>
    </form>
  );
}
