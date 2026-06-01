'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth.store';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function LoginForm() {
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
      await sendOTP(data.email);
      // Redirect to OTP verification after a short delay
      setTimeout(() => {
        router.push('/verify-otp');
      }, 500);
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <form className="w-full flex flex-col space-y-lg" onSubmit={handleSubmit(onSubmit)}>
      {/* Email Input */}
      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
          Email Address
        </label>
        <input
          {...register('email')}
          className={`w-full border rounded-lg px-md py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md ${
            errors.email ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="you@example.com"
          type="email"
        />
        {errors.email && <p className="text-caption text-error">{errors.email.message}</p>}
      </div>

      {/* Error Message */}
      {error && <p className="text-caption text-error bg-error-container p-sm rounded-lg">{error}</p>}

      {/* Submit Button */}
      <button
        className="w-full bg-primary hover:bg-primary-container text-on-primary font-h5-bold py-md px-lg rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined animate-spin">sync</span>
            Sending OTP...
          </>
        ) : (
          <>
            Send OTP
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </>
        )}
      </button>

      {/* Signup Link */}
      <div className="text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:text-primary-container font-h5-bold transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </form>
  );
}
