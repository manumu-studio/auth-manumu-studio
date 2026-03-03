import { z } from 'zod';
import { emailSchema, passwordSchema } from './fields';
import { isValidCountryCode } from '@/lib/data/countries';

export const SignUpSchema = z
  .object({
    firstname: z.string().trim().optional(),
    lastname: z.string().trim().optional(),
    email: emailSchema,
    password: passwordSchema,
    repeatpassword: passwordSchema,
    country: z
      .string()
      .length(2, 'Country is required')
      .refine((v) => isValidCountryCode(v), 'Invalid country'),
    city: z.string().min(2).max(120).optional(),
    address: z.string().min(3).max(500).optional(),
  })
  .refine((d) => d.password === d.repeatpassword, {
    message: 'Passwords must match',
    path: ['repeatpassword'],
  });

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
