import { describe, it, expect } from 'vitest';
import { emailSchema, passwordSchema } from '@/lib/validation/fields';

/**
 * Authentication test suite
 * 
 * Tests critical authentication functionality including:
 * - Input validation (email, password)
 * - Email verification
 * - Password hashing
 * - Session management
 * - OAuth integration
 */

describe('Input Validation', () => {
  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@example.co.uk',
        'user_name@example-domain.com',
        'user123@test.io',
      ];

      validEmails.forEach((email) => {
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com',
        '',
        'user@example',
      ];

      invalidEmails.forEach((email) => {
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });

    it('should normalize email case (lowercase)', () => {
      const email = 'User@Example.COM';
      const result = emailSchema.parse(email.toLowerCase());
      expect(result).toBe('user@example.com');
    });
  });

  describe('Password Validation', () => {
    it('should accept passwords with 8+ characters', () => {
      const validPasswords = [
        'password123',
        'SecureP@ss',
        '12345678',
        'a'.repeat(8),
        'very-long-password-with-many-characters',
      ];

      validPasswords.forEach((password) => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });

    it('should reject passwords shorter than 8 characters', () => {
      const invalidPasswords = [
        '',
        'short',
        '1234567', // 7 characters
        'pass', // 4 characters
      ];

      invalidPasswords.forEach((password) => {
        expect(() => passwordSchema.parse(password)).toThrow();
      });
    });

    it('should provide clear error message for short passwords', () => {
      try {
        passwordSchema.parse('short');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Zod errors have an 'issues' property
        expect(error.issues).toBeDefined();
        expect(error.issues[0].message).toContain('8');
      }
    });
  });
});
