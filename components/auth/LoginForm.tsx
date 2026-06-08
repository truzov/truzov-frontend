'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth.store';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { ArrowRight, Loader2 } from 'lucide-react';

export interface AuthFormProps {
  variant?: 'page' | 'modal';
  redirectTo?: string;
  onSuccess?: () => void;
  onModeChange?: (mode: 'login' | 'signup') => void;
}

interface LoginFormProps extends AuthFormProps {
  onOtpSent?: (identifier: string) => void;
}

export function LoginForm({
  variant = 'page',
  redirectTo,
  onModeChange,
  onOtpSent,
}: LoginFormProps) {
  const router = useRouter();
  const { sendOTP, isLoading, error } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await sendOTP(data.identifier);

      if (onOtpSent) {
        onOtpSent(data.identifier);
        return;
      }

      const redirect =
        redirectTo ??
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null);
      const verifyHref = redirect
        ? `/verify-otp?redirect=${encodeURIComponent(redirect)}`
        : '/verify-otp';

      window.setTimeout(() => {
        router.push(verifyHref);
      }, 500);
    } catch {
      // Error is handled by the store.
    }
  };

  return (
    <form className="flex w-full flex-col space-y-lg" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col space-y-xs">
        <label className="text-label-sm font-body uppercase tracking-wide text-on-surface-variant">
          Email or Phone Number
        </label>
        <input
          {...register('identifier')}
          className={`w-full rounded-lg border px-md py-3 font-body outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
            errors.identifier ? 'border-error' : 'border-outline-variant'
          }`}
          inputMode="email"
          placeholder="you@example.com or 9876543210"
          type="text"
        />
        {errors.identifier ? (
          <p className="text-caption text-error">{errors.identifier.message}</p>
        ) : null}
      </div>

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
            Sending OTP...
          </>
        ) : (
          <>
            Send OTP
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <div className="text-center">
        <p className="text-body-md font-body text-on-surface-variant">
          Don&apos;t have an account?{' '}
          {variant === 'modal' && onModeChange ? (
            <button
              className="text-h5 font-bold font-body text-primary transition-colors hover:text-primary-container"
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
