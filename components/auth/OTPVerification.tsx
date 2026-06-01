'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function OTPVerification() {
  const router = useRouter();
  const { verifyOTP, isLoading, error, pendingEmail } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only keep last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');

    if (code.length !== 6) {
      return;
    }

    try {
      await verifyOTP(code);
      // Redirect to home after successful verification
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch {
      // Error is handled by the store
      // Reset OTP inputs
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const isComplete = otp.every((digit) => digit !== '');

  return (
    <form className="w-full flex flex-col space-y-lg" onSubmit={handleSubmit}>
      {/* Display Email */}
      <div className="flex flex-col space-y-xs">
        <label className="font-h6-bold text-h6-bold text-on-surface">Email</label>
        <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary px-md py-md">
          <span className="font-body-md text-body-md text-on-surface truncate">{pendingEmail || 'Loading...'}</span>
        </div>
      </div>

      {/* OTP Inputs */}
      <div className="flex flex-col space-y-xs">
        <label className="font-h6-bold text-h6-bold text-on-surface">Verification Code</label>
        <p className="font-caption text-caption text-on-surface-variant">Enter the 6-digit code sent to your email</p>

        <div className="flex gap-xs md:gap-sm justify-between">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              className="w-12 h-14 md:w-14 md:h-16 text-center font-h3 text-h3 text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
              inputMode="numeric"
              maxLength={1}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              pattern="[0-9]"
              type="text"
              value={digit}
            />
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && <p className="text-caption text-error bg-error-container p-sm rounded-lg">{error}</p>}

      {/* Submit Button */}
      <button
        className="w-full bg-primary text-on-primary font-h5-bold text-h5-bold py-md px-lg rounded-lg shadow-sm hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isComplete || isLoading}
        type="submit"
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined animate-spin">sync</span>
            Verifying...
          </>
        ) : (
          <>
            Verify & Proceed
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </>
        )}
      </button>

      {/* Auxiliary Links */}
      <div className="flex flex-col items-center gap-md mt-lg">
        <button className="font-body-md text-body-md text-primary hover:text-primary-container transition-colors bg-transparent border-none cursor-pointer" type="button">
          Didn&apos;t receive the code? Resend OTP
        </button>
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-xs" href="/login">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Login
        </Link>
      </div>
    </form>
  );
}
