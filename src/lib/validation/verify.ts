// Zod schemas for email OTP verification and resend flows.
import { z } from "zod";
import { passwordSchema } from "./fields";

export const resendSchema = z.object({ email: z.string().email() });
export const otpVerifySchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
    password: passwordSchema,
    repeatpassword: passwordSchema,
  })
  .refine((data) => data.password === data.repeatpassword, {
    message: "Passwords must match",
    path: ["repeatpassword"],
  });

export type ResendInput = z.infer<typeof resendSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
