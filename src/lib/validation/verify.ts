// Zod schemas for email OTP verification and resend flows
import { z } from "zod";

export const resendSchema = z.object({ email: z.string().email() });
export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
});

export type ResendInput = z.infer<typeof resendSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
