'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth.store';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function SignupForm() {
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

  // Calculate password strength
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
      {/* Full Name */}
      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
          Full Name
        </label>
        <input
          {...register('fullName')}
          className={`w-full border rounded-lg px-md py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md ${
            errors.fullName ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="John Doe"
          type="text"
        />
        {errors.fullName && <p className="text-caption text-error">{errors.fullName.message}</p>}
      </div>

      {/* Email */}
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

      {/* Password */}
      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
          Password
        </label>
        <input
          {...register('password', {
            onChange: (e) => calculateStrength(e.target.value),
          })}
          className={`w-full border rounded-lg px-md py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md ${
            errors.password ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="••••••••"
          type="password"
        />
        {errors.password && <p className="text-caption text-error">{errors.password.message}</p>}

        {/* Password Strength Indicator */}
        {password && (
          <div className="flex items-center gap-xs mt-xs">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-1 flex-grow rounded-full transition-colors ${
                  level <= passwordStrength ? 'bg-primary' : 'bg-outline-variant'
                }`}
              />
            ))}
            <span className="font-caption text-caption text-on-surface-variant ml-sm">
              {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong'}
            </span>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col space-y-xs">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          className={`w-full border rounded-lg px-md py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md ${
            errors.confirmPassword ? 'border-error' : 'border-outline-variant'
          }`}
          placeholder="••••••••"
          type="password"
        />
        {errors.confirmPassword && <p className="text-caption text-error">{errors.confirmPassword.message}</p>}
      </div>

      {/* Error Message */}
      {error && <p className="text-caption text-error bg-error-container p-sm rounded-lg">{error}</p>}

      {/* Submit Button */}
      <button
        className="w-full bg-primary hover:bg-primary-container text-on-primary font-h5-bold py-md px-lg rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Login Link */}
      <div className="text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-container font-h5-bold transition-colors">
            Log In
          </Link>
        </p>
      </div>
    </form>
  );
}
