'use client';

import { useState, useTransition, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { AnimatePresence } from 'framer-motion';
import { SignInSchema } from '@/lib/validation/signin';
import { SignUpSchema } from '@/lib/validation/signup';
import AuthShell from '@/components/ui/AuthShell';
import UserCard from '@/components/ui/UserCard';
import NextButton from '@/components/ui/NextButton';
import { signOut } from 'next-auth/react';
import { registerUser } from '@/features/auth/server/actions';
import EmailStep from '@/features/auth/components/steps/EmailStep';
import PasswordStep from '@/features/auth/components/steps/PasswordStep';
import SignupStep from '@/features/auth/components/steps/SignupStep';
import type { SignupData } from '@/features/auth/components/steps/SignupStep';


type Step = 'email' | 'password' | 'signup';

export default function MimicPage() {
  const { data: session, status, update } = useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  // Signup form state
  const [signupData, setSignupData] = useState<SignupData>({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    repeatpassword: '',
    country: '',
    city: '',
    address: '',
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const directionRef = useRef<'forward' | 'backward'>('forward');
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const handleEmailNext = () => {
    setError(null);
    
    // Validate email format
    const emailValidation = SignInSchema.pick({ email: true }).safeParse({ email });
    if (!emailValidation.success) {
      setError('Please enter a valid email address');
      // Focus back on email input if validation fails
      emailInputRef.current?.focus();
      return;
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    setEmail(normalizedEmail);
    directionRef.current = 'forward';
    setShouldAnimate(true);
    setStep('password');
    // Reset animation flag after animation completes
    setTimeout(() => setShouldAnimate(false), 500);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError(null); // Clear error on input change
  };

  const handlePasswordSubmit = async () => {
    setError(null);

    if (!password) {
      setError('Please enter your password');
      passwordInputRef.current?.focus();
      return;
    }

    startTransition(async () => {
      // Normalize email again before submission
      const normalizedEmail = email.trim().toLowerCase();

      const res = await signIn('credentials', {
        redirect: false,
        email: normalizedEmail,
        password,
      });

      if (res?.error) {
        if (res.error === 'EMAIL_NOT_VERIFIED') {
          setError('Please verify your email address before signing in. Check your inbox for a verification link.');
        } else {
          setError('Invalid credentials. Please check your email and password.');
        }
        // Focus back on password input on error
        passwordInputRef.current?.focus();
        return;
      }

      // Refresh session context without reloading the page
      // This will trigger a re-render and show the UserCard
      await update();
    });
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setError(null); // Clear error on input change
  };

  const handleBack = () => {
    setError(null);
    setPassword('');
    directionRef.current = 'backward';
    setShouldAnimate(true);
    setStep('email');
    // Reset animation flag after animation completes
    setTimeout(() => setShouldAnimate(false), 500);
  };

  const handleGoToSignup = () => {
    setError(null);
    directionRef.current = 'forward';
    setShouldAnimate(true);
    setStep('signup');
    // Reset animation flag after animation completes
    setTimeout(() => setShouldAnimate(false), 500);
  };

  const handleSignupBack = () => {
    setSignupErrors({});
    setError(null);
    directionRef.current = 'backward';
    setShouldAnimate(true);
    setStep('email');
    // Reset animation flag after animation completes
    setTimeout(() => setShouldAnimate(false), 500);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    setError(null);

    // Validate form data
    const validation = SignUpSchema.safeParse(signupData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setSignupErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      Object.entries(signupData).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      const res = await registerUser(formData);
      
      if (!res.ok) {
        const fieldErrors: Record<string, string> = {};
        if (res.errors?.fieldErrors) {
          Object.entries(res.errors.fieldErrors).forEach(([key, messages]) => {
            if (messages && messages[0]) {
              fieldErrors[key] = messages[0];
            }
          });
        }
        if (res.errors?.formErrors?.[0]) {
          setError(res.errors.formErrors[0]);
        }
        setSignupErrors(fieldErrors);
        return;
      }

      // Success - show success message
      setSignupSuccess(true);
      setError(null);
      setSignupErrors({});
      
      // Reset form after a delay
      setTimeout(() => {
        setSignupData({
          firstname: '',
          lastname: '',
          email: '',
          password: '',
          repeatpassword: '',
          country: '',
          city: '',
          address: '',
        });
        setSignupSuccess(false);
        handleSignupBack();
      }, 3000);
    });
  };

  const handleSignupDataChange = (field: keyof SignupData, value: string) => {
    setSignupData({ ...signupData, [field]: value });
  };

  const handleSignupErrorClear = (field: string) => {
    setSignupErrors({ ...signupErrors, [field]: '' });
  };

  const getTitle = () => {
    if (step === 'email') return 'Sign in to ManuMu';
    if (step === 'password') return email;
    if (step === 'signup') return 'Create your account';
    return 'Sign in to ManuMu';
  };

  const getSubtitle = () => {
    if (step === 'password') return 'Enter your password';
    if (step === 'signup') return 'Enter your information';
    return undefined;
  };

  // Show UserCard if authenticated, otherwise show login form
  if (status === 'authenticated' && session?.user) {
    const handleSignOut = async () => {
      await signOut({ callbackUrl: '/' });
    };

    return (
      <AuthShell
        title="Welcome back"
        subtitle="You're signed in to your account"
        animateOnChange={false}
      >
        <div className="space-y-4">
          <UserCard />
          <NextButton
            type="button"
            onClick={handleSignOut}
            variant="secondary"
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </span>
          </NextButton>
        </div>
      </AuthShell>
    );
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <AuthShell
        title="Loading..."
        subtitle="Please wait"
        animateOnChange={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AuthShell>
    );
  }

  // Show login form for unauthenticated users
  return (
    <AuthShell
      title={getTitle()}
      subtitle={getSubtitle()}
      animateOnChange={shouldAnimate}
      direction={directionRef.current}
    >
      <AnimatePresence mode="wait" custom={directionRef.current}>
        {step === 'email' ? (
          <EmailStep
            email={email}
            error={error}
            isPending={isPending}
            emailInputRef={emailInputRef}
            direction={directionRef.current}
            onEmailChange={handleEmailChange}
            onNext={handleEmailNext}
            onGoToSignup={handleGoToSignup}
          />
        ) : step === 'password' ? (
          <PasswordStep
            password={password}
            error={error}
            isPending={isPending}
            passwordInputRef={passwordInputRef}
            direction={directionRef.current}
            onPasswordChange={handlePasswordChange}
            onSubmit={handlePasswordSubmit}
            onBack={handleBack}
          />
        ) : (
          <SignupStep
            signupData={signupData}
            signupErrors={signupErrors}
            signupSuccess={signupSuccess}
            error={error}
            isPending={isPending}
            emailInputRef={emailInputRef}
            direction={directionRef.current}
            onSignupDataChange={handleSignupDataChange}
            onSignupErrorClear={handleSignupErrorClear}
            onSubmit={handleSignupSubmit}
            onBack={handleSignupBack}
          />
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

