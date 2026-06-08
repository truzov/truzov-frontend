'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function OTPVerification() {
  const router = useRouter();
  const { verifyOTP, sendOTP, isLoading, error, pendingIdentifier } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const redirectParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    try {
      await verifyOTP(code);
      setTimeout(() => router.push(redirectParam || '/'), 500);
    } catch {
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!pendingIdentifier || resendCooldown > 0) return;
    try {
      await sendOTP(pendingIdentifier);
      setResendCooldown(30);
    } catch {
      // Error shown via store
    }
  };

  const isComplete = otp.every((digit) => digit !== '');

  return (
    <form className="w-full flex flex-col space-y-lg" onSubmit={handleSubmit}>
      <div className="flex flex-col space-y-xs">
        <label className="text-h6 font-bold font-body text-on-surface">Email</label>
        <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary px-md py-md">
          <span className="text-body-md font-body text-on-surface truncate">{pendingIdentifier || 'Loading...'}</span>
        </div>
      </div>

      <div className="flex flex-col space-y-xs">
        <label className="text-h6 font-bold font-body text-on-surface">Verification Code</label>
        <p className="text-caption font-body text-on-surface-variant">Enter the 6-digit code sent to your email</p>
        <div className="flex gap-xs md:gap-sm justify-between">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              className="w-12 h-14 md:w-14 md:h-16 text-center text-h3 font-heading text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
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

      {error ? <p className="text-caption text-error bg-error-container p-sm rounded-lg">{error}</p> : null}

      <button
        className="w-full bg-primary text-on-primary text-h5 font-bold font-body py-md px-lg rounded-lg shadow-sm hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isComplete || isLoading}
        type="submit"
      >
        {isLoading ? (
          <><Loader2 className="h-5 w-5 animate-spin" />Verifying...</>
        ) : (
          <>Verify & Proceed<ArrowRight className="h-5 w-5" /></>
        )}
      </button>

      <div className="flex flex-col items-center gap-md mt-lg">
        <button
          className="text-body-md font-body text-primary hover:text-primary-container transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={resendCooldown > 0 || isLoading}
          type="button"
          onClick={handleResend}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive the code? Resend OTP"}
        </button>
        <Link
          className="text-body-md font-body text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-xs"
          href={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
      </div>
    </form>
  );
}
