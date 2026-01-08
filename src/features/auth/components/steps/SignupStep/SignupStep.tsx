'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import InputField from '@/components/ui/InputField';
import NextButton from '@/components/ui/NextButton';
import type { SignupStepProps } from './SignupStep.types';
import styles from './SignupStep.module.scss';

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

export default function SignupStep({
  signupData,
  signupErrors,
  signupSuccess,
  error,
  isPending,
  emailInputRef,
  direction,
  onSignupDataChange,
  onSignupErrorClear,
  onSubmit,
  onBack,
}: SignupStepProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      key="signup-step"
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
      {signupSuccess ? (
        <div className={styles.signupSuccess}>
          <p>Account created successfully! Please check your email to verify your account.</p>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          aria-label="Create account"
        >
          <div className={styles.signupForm}>
            <div className={styles.signupRow}>
              <InputField
                id="firstname"
                name="firstname"
                type="text"
                label="First name"
                value={signupData.firstname}
                onChange={(e) => {
                  onSignupDataChange('firstname', e.target.value);
                  onSignupErrorClear('firstname');
                }}
                error={signupErrors.firstname}
                disabled={isPending}
                autoComplete="given-name"
              />
              <InputField
                id="lastname"
                name="lastname"
                type="text"
                label="Last name"
                value={signupData.lastname}
                onChange={(e) => {
                  onSignupDataChange('lastname', e.target.value);
                  onSignupErrorClear('lastname');
                }}
                error={signupErrors.lastname}
                disabled={isPending}
                autoComplete="family-name"
              />
            </div>

            <InputField
              ref={emailInputRef}
              id="signup-email"
              name="email"
              type="email"
              label="Email"
              value={signupData.email}
              onChange={(e) => {
                onSignupDataChange('email', e.target.value);
                onSignupErrorClear('email');
              }}
              error={signupErrors.email || error || undefined}
              disabled={isPending}
              autoComplete="email"
              required
            />

            <div className={styles.signupRow}>
              <InputField
                id="signup-password"
                name="password"
                type="password"
                label="Password"
                value={signupData.password}
                onChange={(e) => {
                  onSignupDataChange('password', e.target.value);
                  onSignupErrorClear('password');
                  onSignupErrorClear('repeatpassword');
                }}
                error={signupErrors.password}
                disabled={isPending}
                autoComplete="new-password"
                required
              />
              <InputField
                id="repeatpassword"
                name="repeatpassword"
                type="password"
                label="Confirm password"
                value={signupData.repeatpassword}
                onChange={(e) => {
                  onSignupDataChange('repeatpassword', e.target.value);
                  onSignupErrorClear('repeatpassword');
                }}
                error={signupErrors.repeatpassword}
                disabled={isPending}
                autoComplete="new-password"
                required
              />
            </div>

            <div className={styles.signupRow}>
              <InputField
                id="country"
                name="country"
                type="text"
                label="Country (ISO-2)"
                value={signupData.country}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().slice(0, 2);
                  onSignupDataChange('country', value);
                  onSignupErrorClear('country');
                }}
                error={signupErrors.country}
                disabled={isPending}
                autoComplete="country"
              />
              <InputField
                id="city"
                name="city"
                type="text"
                label="City"
                value={signupData.city}
                onChange={(e) => {
                  onSignupDataChange('city', e.target.value);
                  onSignupErrorClear('city');
                }}
                error={signupErrors.city}
                disabled={isPending}
                autoComplete="address-level2"
              />
            </div>

            <InputField
              id="address"
              name="address"
              type="text"
              label="Address"
              value={signupData.address}
              onChange={(e) => {
                onSignupDataChange('address', e.target.value);
                onSignupErrorClear('address');
              }}
              error={signupErrors.address}
              disabled={isPending}
              autoComplete="street-address"
            />

            <div className="space-y-2">
              <NextButton
                type="submit"
                isLoading={isPending}
                disabled={isPending}
              >
                Create account
              </NextButton>

              <NextButton
                type="button"
                onClick={onBack}
                disabled={isPending}
                variant="secondary"
                aria-label="Go back to sign in"
              >
                Back
              </NextButton>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}

