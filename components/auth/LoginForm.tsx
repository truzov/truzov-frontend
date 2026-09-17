'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { isValidRedirect } from '@/lib/auth/redirect';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/auth.store';
import { useOtpModalStore } from '@/store/otp-modal.store';

export interface AuthFormProps {
  variant?: 'page' | 'modal';
  redirectTo?: string;
  onSuccess?: () => void;
  onModeChange?: (mode: 'login' | 'signup') => void;
}

interface LoginFormProps extends AuthFormProps {
  /** Lets the modal swap to its own OTP step instead of navigating to /verify-otp. */
  onOtpSent?: (identifier: string) => void;
}

export function LoginForm({
  variant = 'page',
  redirectTo,
  onSuccess,
  onModeChange,
  onOtpSent,
}: LoginFormProps) {
  const router = useRouter();
  const sendOtp = useAuthStore((state) => state.sendOtp);
  const loginWithPassword = useAuthStore((state) => state.loginWithPassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const openOtpModal = useOtpModalStore((state) => state.openOtpModal);

  /**
   * Both documented sign-in paths are offered because they suit different accounts.
   * OTP (`/auth/otp/send` + `/auth/otp/verify`) is the default and works for any identifier.
   * Password (`/auth/login`) is here because the endpoint exists and staff accounts use it —
   * note the backend's own seeded users have placeholder password hashes, so OTP is the only
   * path that works against freshly seeded data.
   */
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Redirect target: explicit prop first, then the `?redirect=` the guard added.
   * Both are untrusted (the prop comes from `openAuthModal`, the query string from the URL), so
   * the candidate is gated to a same-origin relative path before it is pushed or re-encoded into
   * `/verify-otp?redirect=…`. An unsafe candidate becomes `null`, which both call sites below
   * already treat as "go to the default landing route".
   */
  const resolveRedirect = () => {
    const candidate =
      redirectTo ??
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null);
    return isValidRedirect(candidate) ? candidate : null;
  };

  const onSubmit = async (data: LoginInput) => {
    try {
      if (usePassword) {
        await loginWithPassword(data.identifier, password);
        // Password login returns tokens directly, so there is no OTP hop.
        if (onSuccess) {
          onSuccess();
          return;
        }
        router.push(resolveRedirect() || '/');
        return;
      }

      await sendOtp(data.identifier, 'login');

      if (onOtpSent) {
        onOtpSent(data.identifier);
        return;
      }

      // The standalone /login page redirects into the modal, so this page branch is rarely hit;
      // when it is, verification happens in the popup rather than on a deleted /verify-otp page.
      openOtpModal({ redirectTo: resolveRedirect() ?? undefined });
    } catch {
      // Rendered from the store below.
    }
  };

  return (
    <form className="flex w-full flex-col space-y-lg" onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('identifier')}
        error={errors.identifier?.message}
        label="Email or Phone Number"
        inputMode="email"
        placeholder="you@example.com or 9876543210"
        type="text"
      />

      {usePassword ? (
        <Input
          autoComplete="current-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          type="password"
          value={password}
        />
      ) : null}

      {error ? (
        <p className="rounded-lg bg-error-container p-sm text-caption text-error">{error}</p>
      ) : null}

      <button
        className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-h6 font-bold font-body text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || (usePassword && password.length === 0)}
        type="submit"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {usePassword ? 'Signing in...' : 'Sending OTP...'}
          </>
        ) : (
          <>
            {usePassword ? 'Sign In' : 'Send OTP'}
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <button
        className="text-center text-body-md font-body text-primary transition-colors hover:text-primary-container"
        type="button"
        onClick={() => {
          // Clear the previous mode's error so a failed password attempt does not linger above
          // the OTP form (and vice versa).
          clearError();
          setPassword('');
          setUsePassword((current) => !current);
        }}
      >
        {usePassword ? 'Sign in with a one-time code instead' : 'Sign in with a password instead'}
      </button>

      {!usePassword ? (
        <p className="text-center text-caption font-body text-on-surface-variant">
          {/* Neutral wording on purpose: /auth/otp/send answers identically for known and
              unknown identifiers to prevent account enumeration, so the UI must not imply
              whether an account exists. */}
          We&apos;ll send a code to the email or phone you enter, if it matches an account.
        </p>
      ) : null}

      <div className="text-center">
        <p className="text-body-md font-body text-on-surface-variant">
          Don&apos;t have an account?{' '}
          {variant === 'modal' && onModeChange ? (
            <button
              className="text-h6 font-body text-primary transition-colors hover:text-primary-container"
              type="button"
              onClick={() => onModeChange('signup')}
            >
              Sign Up
            </button>
          ) : (
            <Link
              className="text-h5 font-bold font-body text-primary transition-colors hover:text-primary-container"
              href="/signup"
            >
              Sign Up
            </Link>
          )}
        </p>
      </div>
    </form>
  );
}
