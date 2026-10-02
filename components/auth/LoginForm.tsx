'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
  const checkAccountExists = useAuthStore((state) => state.checkAccountExists);
  const loginWithPassword = useAuthStore((state) => state.loginWithPassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const openOtpModal = useOtpModalStore((state) => state.openOtpModal);
  const pendingIdentifier = useAuthStore((state) => state.pendingIdentifier);

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
    defaultValues: { identifier: pendingIdentifier ?? '' },
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

      // Gate the OTP send on account existence: an identifier with no account can never redeem
      // a code, so sending one is a dead end the user has to sit through before reaching signup.
      // This is a deliberate, scoped exception to the "otp/send never confirms existence" rule
      // elsewhere in this flow — see checkAccountExists's doc comment (store and endpoint layers)
      // and AuthService.accountExists on the backend for the rate-limiting that keeps this
      // endpoint from becoming a general enumeration oracle.
      const exists = await checkAccountExists(data.identifier);

      if (!exists) {
        if (onModeChange) onModeChange('signup');
        else router.push('/signup');
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
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('identifier')}
        error={errors.identifier?.message}
        label="Email or phone number"
        autoComplete="username"
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
        <p role="alert" className="rounded-xl bg-error-container p-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <Button
        className="w-full"
        size="lg"
        disabled={isLoading || (usePassword && password.length === 0)}
        type="submit"
      >
        {isLoading ? (
          <>
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            {usePassword ? 'Signing in...' : 'Sending OTP...'}
          </>
        ) : (
          <>
            {usePassword ? 'Sign in' : 'Send code'}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </>
        )}
      </Button>

      <button
        className="min-h-11 rounded-lg text-center text-sm font-medium text-primary hover:bg-brand-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
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
        <p className="text-center text-sm leading-relaxed text-on-surface-variant">
          {/* Neutral wording on purpose: /auth/otp/send answers identically for known and
              unknown identifiers to prevent account enumeration, so the UI must not imply
              whether an account exists. */}
          We&apos;ll send a code to the email or phone you enter, if it matches an account.
        </p>
      ) : null}

      <div className="text-center">
        <p className="text-sm text-on-surface-variant">
          Don&apos;t have an account?{' '}
          {variant === 'modal' && onModeChange ? (
            <button
              className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
              type="button"
              onClick={() => onModeChange('signup')}
            >
              Sign up
            </button>
          ) : (
            <Link
              className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-primary underline underline-offset-4"
              href="/signup"
            >
              Sign up
            </Link>
          )}
        </p>
      </div>
    </form>
  );
}
