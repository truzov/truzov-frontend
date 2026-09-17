'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/auth.store';
import type { AuthFormProps } from './LoginForm';
import { isValidRedirect } from '@/lib/auth/redirect';
import { useOtpModalStore } from '@/store/otp-modal.store';

interface SignupFormProps extends AuthFormProps {
  /** Lets the modal swap to its own OTP step instead of navigating to /verify-otp. */
  onOtpSent?: () => void;
}

/**
 * Account creation via `POST /auth/signup`.
 *
 * The important behavioural fix here: signup does NOT log the user in. It returns an OTP session
 * and no tokens, so the account is unusable until the code is verified. The previous mock set
 * `isLoggedIn: true` immediately and never verified anything, which meant the entire OTP step
 * was decorative.
 */
export function SignupForm({
  variant = 'page',
  redirectTo,
  onSuccess,
  onModeChange,
  onOtpSent,
}: SignupFormProps) {
  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const openOtpModal = useOtpModalStore((state) => state.openOtpModal);
  // The ACCOUNT_NOT_FOUND login flow: the identifier was proven by a consumed OTP
  // session the store is holding, so pre-fill it and let signup carry the voucher.
  const verifiedOtpSessionId = useAuthStore((state) => state.verifiedOtpSessionId);
  const pendingIdentifier = useAuthStore((state) => state.pendingIdentifier);
  const pendingChannel = useAuthStore((state) => state.otpChannel);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const carryingForward = verifiedOtpSessionId != null;
  const carriedEmail =
    carryingForward && pendingIdentifier?.includes('@') ? pendingIdentifier : '';
  const carriedPhone =
    carryingForward && pendingIdentifier && !pendingIdentifier.includes('@')
      ? pendingIdentifier
      : '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      otpChannel: carryingForward ? (pendingChannel ?? 'phone') : 'phone',
      phone: carriedPhone,
      email: carriedEmail || undefined,
    },
  });

  const password = watch('password');
  const otpChannel = watch('otpChannel');

  /**
   * Advisory only. The submit rule is the API's (8-128 chars, a letter and a digit); this meter
   * encourages more without blocking a password the server would accept.
   */
  const calculateStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  };

  const onSubmit = async (data: SignupInput) => {
    try {
      // Always returns an OTP session and NO tokens: signup never logs the user in, and the
      // account is unusable until the code is verified on the next step — even when the user
      // arrived from the ACCOUNT_NOT_FOUND flow, they still verify here.
      await signup({
        fullName: data.fullName,
        phone: data.phone,
        password: data.password,
        email: data.email || undefined,
        otpChannel: data.otpChannel,
      });

      if (onOtpSent) {
        onOtpSent();
        return;
      }

      const rawRedirect =
        redirectTo ??
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null);
      const redirect = isValidRedirect(rawRedirect) ? rawRedirect : null;

      // Verification happens in the popup, not on a full page. Note signup returns no tokens,
      // so the phone must still be verified before the account is usable.
      openOtpModal({ redirectTo: redirect ?? undefined });
    } catch {
      // Rendered from the store below.
    }
  };

  return (
    <form className="flex w-full flex-col space-y-lg" onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('fullName')}
        error={errors.fullName?.message}
        label="Full Name"
        placeholder="Asha Singh"
        type="text"
      />

      {/* Required by the API even when the code is delivered by email — it identifies the
          account. The old form had no phone field at all, so every signup would have been a 400. */}
      <Input
        {...register('phone')}
        error={errors.phone?.message}
        inputMode="tel"
        label="Phone Number"
        placeholder="9876543210"
        type="tel"
      />

      <Input
        {...register('email')}
        error={errors.email?.message}
        label={otpChannel === 'email' ? 'Email Address' : 'Email Address (optional)'}
        placeholder="you@example.com"
        type="email"
      />

      <fieldset className="grid gap-2">
        <legend className="text-caption font-body text-on-surface-variant">
          Where should we send your verification code?
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-body-md">
            <input {...register('otpChannel')} type="radio" value="phone" />
            Text message
          </label>
          <label className="flex items-center gap-2 text-body-md">
            <input {...register('otpChannel')} type="radio" value="email" />
            Email
          </label>
        </div>
      </fieldset>

      <div>
        <Input
          {...register('password', {
            onChange: (event) => calculateStrength(event.target.value),
          })}
          error={errors.password?.message}
          label="Password"
          placeholder="At least 8 characters, with a letter and a number"
          type="password"
        />
        {password ? (
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  level <= passwordStrength ? 'bg-primary' : 'bg-outline-variant'
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-on-surface-variant">
              {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong'}
            </span>
          </div>
        ) : null}
      </div>

      <Input
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
        label="Confirm Password"
        placeholder="Confirm password"
        type="password"
      />

      {error ? (
        <p className="rounded-lg bg-error-container p-sm text-caption text-error">{error}</p>
      ) : null}

      <button
        className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-h5 font-bold font-body text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Creating Account...
          </>
        ) : (
          <>
            Create Account
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <div className="text-center">
        <p className="text-body-md font-body text-on-surface-variant">
          Already have an account?{' '}
          {variant === 'modal' && onModeChange ? (
            <button
              className="text-h5 font-bold font-body text-primary transition-colors hover:text-primary-container"
              type="button"
              onClick={() => onModeChange('login')}
            >
              Log In
            </button>
          ) : (
            <Link
              className="text-h5 font-bold font-body text-primary transition-colors hover:text-primary-container"
              href="/login"
            >
              Log In
            </Link>
          )}
        </p>
      </div>
    </form>
  );
}
