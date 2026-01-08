import type { RefObject } from 'react';

export interface SignupData {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  repeatpassword: string;
  country: string;
  city: string;
  address: string;
}

export interface SignupStepProps {
  signupData: SignupData;
  signupErrors: Record<string, string>;
  signupSuccess: boolean;
  error: string | null;
  isPending: boolean;
  emailInputRef: RefObject<HTMLInputElement | null>;
  direction: 'forward' | 'backward';
  onSignupDataChange: (field: keyof SignupData, value: string) => void;
  onSignupErrorClear: (field: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

