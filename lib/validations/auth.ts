import { z } from 'zod';

export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email or phone number')
  .refine((value) => {
    const normalizedPhone = value.replace(/\D/g, '');
    const isEmail = z.string().email().safeParse(value).success;
    const isPhone = normalizedPhone.length === 10;

    return isEmail || isPhone;
  }, 'Enter a valid email or 10 digit phone number');

export const loginSchema = z.object({
  identifier: loginIdentifierSchema,
});

export const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const otpSchema = z.object({
  code: z.string().length(6, 'Must be 6 digits').regex(/^\d+$/, 'Only digits allowed'),
});

// Keep legacy names for backward compatibility
export const registerSchema = signupSchema;

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type OTPInput = z.infer<typeof otpSchema>;
