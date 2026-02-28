// OTP verification form UI with 6-digit inputs, timers, and resend action.
'use client';

import NextButton from '@/components/ui/NextButton';
import type { OtpVerificationFormProps } from './OtpVerificationForm.types';
import { useOtpVerificationForm } from './useOtpVerificationForm';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function OtpVerificationForm({ email }: OtpVerificationFormProps) {
  const {
    digits,
    error,
    isPending,
    cooldownRemaining,
    expiryRemaining,
    inputRefs,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    handleResend,
  } = useOtpVerificationForm(email);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Verify email with one-time code">
      <div className="space-y-2">
        <label className="block text-sm text-gray-600 dark:text-gray-300" htmlFor="otp-digit-0">
          Enter the 6-digit code
        </label>
        <div className="flex items-center justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              id={`otp-digit-${index}`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]"
              maxLength={1}
              value={digit}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              className="h-12 w-11 rounded border border-gray-300 text-center text-xl font-semibold outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
              aria-label={`Digit ${index + 1}`}
              disabled={isPending}
            />
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300">
        Code expires in <strong>{formatTime(expiryRemaining)}</strong>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <NextButton type="submit" isLoading={isPending} disabled={isPending}>
        Verify code
      </NextButton>

      <button
        type="button"
        onClick={handleResend}
        disabled={cooldownRemaining > 0 || isPending}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
      >
        {cooldownRemaining > 0 ? `Resend code in ${formatTime(cooldownRemaining)}` : 'Resend code'}
      </button>
    </form>
  );
}
