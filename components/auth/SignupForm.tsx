'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import type { AuthFormProps } from './LoginForm';
import { Input } from '@/components/ui/Input';

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
      <Input
        {...register('fullName')}
        error={errors.fullName?.message}
        label="Full Name"
        placeholder="John Doe"
        type="text"
      />

      <Input
        {...register('email')}
        error={errors.email?.message}
        label="Email Address"
        placeholder="you@example.com"
        type="email"
      />

      <div>
        <Input
          {...register('password', {
            onChange: (event) => calculateStrength(event.target.value),
          })}
          error={errors.password?.message}
          label="Password"
          placeholder="Password"
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
