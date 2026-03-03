// Shared validation schemas and rule checkers for form fields
import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email');

// Password rules for UI feedback — each rule has id, label, and test function
export const PASSWORD_RULES = [
  { id: 'min-length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'max-length', label: 'No more than 128 characters', test: (v: string) => v.length <= 128 },
  { id: 'uppercase', label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lowercase', label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'number', label: 'One number', test: (v: string) => /\d/.test(v) },
  {
    id: 'special',
    label: 'One special character (!@#$%^&*...)',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
  {
    id: 'no-spaces',
    label: 'No leading or trailing spaces',
    test: (v: string) => v === v.trim(),
  },
] as const;

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128, 'No more than 128 characters')
  .refine((v) => /[A-Z]/.test(v), 'Must contain an uppercase letter')
  .refine((v) => /[a-z]/.test(v), 'Must contain a lowercase letter')
  .refine((v) => /\d/.test(v), 'Must contain a number')
  .refine((v) => /[^A-Za-z0-9]/.test(v), 'Must contain a special character')
  .refine((v) => v === v.trim(), 'Cannot start or end with spaces');
