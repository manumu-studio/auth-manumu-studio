import type { RefObject } from 'react';

export interface PasswordStepProps {
  password: string;
  error: string | null;
  isPending: boolean;
  passwordInputRef: RefObject<HTMLInputElement | null>;
  direction: 'forward' | 'backward';
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

