import { z } from "zod";
export const resendSchema = z.object({ email: z.string().email() });
export const tokenSchema = z.object({ token: z.string().min(10) });
export type ResendInput = z.infer<typeof resendSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
