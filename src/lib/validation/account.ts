// Validation schemas for account management operations
import { z } from 'zod';
import { isValidCountryCode } from '@/lib/data/countries';
import { emailSchema, passwordSchema } from './fields';

// Profile update schema
export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  country: z.string().length(2, 'Country code must be exactly 2 characters').optional(),
  city: z.string().min(2, 'City must be at least 2 characters').max(120, 'City must not exceed 120 characters').optional(),
  address: z.string().min(3, 'Address must be at least 3 characters').max(500, 'Address must not exceed 500 characters').optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// OAuth onboarding schema
export const OnboardingSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100).trim(),
  country: z.string()
    .min(2, 'Country is required')
    .max(2)
    .refine(isValidCountryCode, 'Invalid country code'),
  nickname: z.string().trim().max(30, 'Nickname must be 30 characters or less').optional(),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

// Password change schema with validation
export const ChangePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
})
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Provider disconnection schema
export const DisconnectProviderSchema = z.object({
  provider: z.enum(['google', 'github']),
});

export type DisconnectProviderInput = z.infer<typeof DisconnectProviderSchema>;

// Account deletion schema
export const DeleteAccountSchema = z.object({
  emailConfirmation: emailSchema,
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
