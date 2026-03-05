// Custom hook for OTP input behavior, verification submit, and resend cooldown.
'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 120;
const EXPIRY_SECONDS = 600;

const reasonToMessage: Record<string, string> = {
  "invalid-code": 'Wrong code. Check your email and try again.',
  expired: 'Code expired. Request a new code to continue.',
  "max-attempts": 'Too many attempts - request a new code.',
  "not-found": 'Invalid code. The code is invalid or already used.',
  "already-verified": 'Email already verified. You can sign in now.',
  "bad-request": 'Invalid request. Please check your code and try again.',
  "rate-limited": 'Too many requests. Please try again in a moment.',
  cooldown: 'Please wait before requesting another code.',
};

export function useOtpVerificationForm(email: string, callbackUrl?: string) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(RESEND_COOLDOWN_SECONDS);
  const [expiryRemaining, setExpiryRemaining] = useState<number>(EXPIRY_SECONDS);
  const [isPending, startTransition] = useTransition();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (expiryRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setExpiryRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryRemaining]);

  const submitCode = (nextCode: string) => {
    startTransition(async () => {
      setError(null);

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code: nextCode }),
      });

      const result = (await response.json().catch(() => ({ ok: false, reason: 'bad-request' }))) as {
        ok?: boolean;
        reason?: string;
      };

      if (result.ok) {
        // Session is created server-side during verification — redirect directly
        window.location.href = callbackUrl || '/dashboard';
        return;
      }

      const reason = result.reason ?? 'bad-request';
      setError(reasonToMessage[reason] ?? 'Verification failed. Please try again.');
    });
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const numericValue = rawValue.replace(/\D/g, '');
    if (!numericValue) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const next = [...digits];
    next[index] = numericValue.slice(-1);
    setDigits(next);
    setError(null);

    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') {
      return;
    }

    if (digits[index]) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    if (index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) {
      return;
    }

    const next = Array(CODE_LENGTH).fill('').map((_, idx) => pasted[idx] ?? '');
    setDigits(next);
    setError(null);

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isPending) {
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the full 6-digit code.');
      return;
    }

    submitCode(code);
  };

  useEffect(() => {
    if (/^\d{6}$/.test(code) && !isPending) {
      submitCode(code);
    }
  }, [code, isPending]);

  const handleResend = () => {
    if (cooldownRemaining > 0 || isPending) {
      return;
    }

    startTransition(async () => {
      setError(null);

      const response = await fetch('/api/auth/verify/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json().catch(() => ({ ok: false, reason: 'bad-request' }))) as {
        ok?: boolean;
        reason?: string;
      };

      if (!result.ok) {
        const reason = result.reason ?? 'bad-request';
        setError(reasonToMessage[reason] ?? 'Could not resend code. Please try again.');
        return;
      }

      setDigits(Array(CODE_LENGTH).fill(''));
      setExpiryRemaining(EXPIRY_SECONDS);
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
    });
  };

  return {
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
  };
}
