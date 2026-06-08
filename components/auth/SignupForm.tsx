'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth.store';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import type { AuthFormProps } from './LoginForm';

export function SignupForm({
  variant = 'page',
  redirectTo,
  onSuccess,
  onModeChange,
}: AuthFormProps) {
  const router = useRouter();
  const { signup, isLoading, error } = useAuthStore();
  const [passwordStrength, setPasswordStrength] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password');

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
      await signup(data.fullName, data.email, data.password);

      if (onSuccess) {
        onSuccess();
        return;
      }

      const redirect =
        redirectTo ??
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null);

      window.setTimeout(() => {
        router.push(redirect || '/');
      }, 500);
    } catch {
      // Error is handled by the store.
    }
  };

  return (
    <form className="flex w-full flex-col space-y-lg" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
          Full Name
        </label>
        <input
          {...register('fullName')}
          className={`w-full rounded-lg border px-md py-3 font-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
            errors.fullName ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="John Doe"
          type="text"
        />
        {errors.fullName ? <p className="text-caption text-error">{errors.fullName.message}</p> : null}
      </div>

      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
          Email Address
        </label>
        <input
          {...register('email')}
          className={`w-full rounded-lg border px-md py-3 font-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
            errors.email ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="you@example.com"
          type="email"
        />
        {errors.email ? <p className="text-caption text-error">{errors.email.message}</p> : null}
      </div>

      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
          Password
        </label>
        <input
          {...register('password', {
            onChange: (event) => calculateStrength(event.target.value),
          })}
          className={`w-full rounded-lg border px-md py-3 font-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
            errors.password ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="Password"
          type="password"
        />
        {errors.password ? <p className="text-caption text-error">{errors.password.message}</p> : null}

        {password ? (
          <div className="mt-xs flex items-center gap-xs">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-1 flex-grow rounded-full transition-colors ${
                  level <= passwordStrength ? 'bg-primary' : 'bg-outline-variant'
                }`}
              />
            ))}
            <span className="ml-sm font-caption text-caption text-on-surface-variant">
              {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          className={`w-full rounded-lg border px-md py-3 font-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
            errors.confirmPassword ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="Confirm password"
          type="password"
        />
        {errors.confirmPassword ? (
          <p className="text-caption text-error">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {error ? <p className="rounded-lg bg-error-container p-sm text-caption text-error">{error}</p> : null}

      <button
        className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md font-h5-bold text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined animate-spin">sync</span>
            Creating Account...
          </>
        ) : (
          <>
            Create Account
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </>
        )}
      </button>

      <div className="text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Already have an account?{' '}
          {variant === 'modal' && onModeChange ? (
            <button
              className="font-h5-bold text-primary transition-colors hover:text-primary-container"
              type="button"
              onClick={() => onModeChange('login')}
            >
              Log In
            </button>
          ) : (
            <Link
              className="font-h5-bold text-primary transition-colors hover:text-primary-container"
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
