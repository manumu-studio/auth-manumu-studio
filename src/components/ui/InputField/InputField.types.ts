export interface InputFieldProps {
  id: string;
  name: string;
  type: 'email' | 'password' | 'text';
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
}

