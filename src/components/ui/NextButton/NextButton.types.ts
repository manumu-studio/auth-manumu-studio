import type { ReactNode } from 'react';

export interface NextButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}
