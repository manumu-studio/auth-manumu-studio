'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import InputField from '@/components/ui/InputField';
import NextButton from '@/components/ui/NextButton';
import type { PasswordStepProps } from './PasswordStep.types';

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? 20 : -20,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? -20 : 20,
  }),
};

export default function PasswordStep({
  password,
  error,
  isPending,
  passwordInputRef,
  direction,
  onPasswordChange,
  onSubmit,
  onBack,
}: PasswordStepProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      key="password-step"
      custom={direction}
      variants={stepVariants}
      initial={mounted ? "enter" : false}
      animate="center"
      exit="exit"
      transition={{ 
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
        aria-label="Enter password"
      >
        <InputField
          ref={passwordInputRef}
          id="password"
          name="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => {
            onPasswordChange(e.target.value);
          }}
          error={error || undefined}
          disabled={isPending}
          autoComplete="current-password"
          required
        />

        <div className="space-y-2">
          <NextButton
            type="submit"
            isLoading={isPending}
            disabled={!password || isPending}
          >
            Sign in
          </NextButton>

          <NextButton
            type="button"
            onClick={onBack}
            disabled={isPending}
            variant="secondary"
            aria-label="Go back to email step"
          >
            Back
          </NextButton>
        </div>
      </form>
    </motion.div>
  );
}

