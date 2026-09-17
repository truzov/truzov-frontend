import { z } from 'zod';

/**
 * Client-side validation, aligned to the API contract in TRUZOV_API_REFERENCE.md.
 *
 * The rule followed here: the client may be no STRICTER than the server on what it accepts,
 * because a client-only rule rejects input the server would have taken and the user has no way
 * to tell the difference. It may be stricter on things the server treats as optional but the
 * business needs (a full delivery address, for instance) — that is a product decision, not a
 * contract mismatch.
 */

/** 10 local digits, or E.164 (+ and 8-15 digits). Both are documented as acceptable. */
const PHONE_PATTERN = /^(?:\d{10}|\+\d{8,15})$/;

export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email or phone number')
  .max(255, 'That is too long')
  .refine((value) => {
    const isEmail = z.string().email().safeParse(value).success;
    // Strip formatting before the length check so "98765 43210" and "(987) 654-3210" pass.
    const isPhone = PHONE_PATTERN.test(value.replace(/[^\d+]/g, ''));

    return isEmail || isPhone;
  }, 'Enter a valid email or 10 digit phone number');

export const loginSchema = z.object({
  identifier: loginIdentifierSchema,
});

/**
 * Password rule copied from the reference: 8-128 characters, at least one letter and one digit.
 *
 * The previous schema demanded an uppercase letter and did not require a digit. That was
 * strictly wrong in both directions — it rejected `secret123` (which the server accepts) and
 * allowed `Password` (which it does not). The signup form's strength meter still encourages
 * mixed case; it just no longer blocks submission.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(150, 'Name must be at most 150 characters'),
    // Required by the API, even when the OTP is delivered by email.
    phone: z
      .string()
      .trim()
      .min(1, 'Enter your phone number')
      .refine(
        (value) => PHONE_PATTERN.test(value.replace(/[^\d+]/g, '')),
        'Enter a valid 10 digit phone number'
      ),
    // Optional overall — see the cross-field rule below for the email-channel case.
    email: z.union([z.literal(''), z.string().trim().email('Invalid email address').max(255)]).optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
    // No zod `.default()` here: a default makes the parsed OUTPUT type required while the INPUT
    // type stays optional, and react-hook-form's resolver requires both to match. The form
    // supplies 'phone' via `defaultValues` instead, which keeps one type and the same behaviour.
    otpChannel: z.enum(['phone', 'email']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.otpChannel !== 'email' || Boolean(data.email), {
    // "Email channel requires an email" — caught here so the user sees it on the field rather
    // than as a 400 after submitting.
    message: 'Add an email address to receive the code by email',
    path: ['email'],
  });

/**
 * The API accepts 4-10 digits. Six is what this deployment issues
 * (`truzov.auth.otp.length: 6`), so the form renders six boxes, but the schema stays as loose as
 * the contract so a configuration change does not silently break verification.
 */
export const otpSchema = z.object({
  code: z
    .string()
    .regex(/^\d{4,10}$/, 'Enter the numeric code from your message'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type OTPInput = z.infer<typeof otpSchema>;
