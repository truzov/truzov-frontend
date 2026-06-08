'use client';

import { IdCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

type AuthMode = 'login' | 'signup';
type AuthStep = 'form' | 'otp';

interface AuthFormProps {
  mode: AuthMode;
  variant?: 'page' | 'modal';
  redirectTo?: string;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
}

export function AuthForm({
  mode,
  variant = 'page',
  redirectTo,
  onSuccess,
  onModeChange,
}: AuthFormProps) {
  const { verifyOTP, loginAs, isLoading, error, pendingIdentifier, clearError } =
    useAuthStore();
  const [step, setStep] = useState<AuthStep>('form');
  const [otp, setOtp] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setStep('form');
    setOtp('');
    setFormError(null);
    clearError();
  }, [clearError, mode]);

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setFormError('Enter the 6 digit OTP.');
      return;
    }

    try {
      await verifyOTP(otp);
      onSuccess?.();
    } catch {
      setOtp('');
    }
  };

  const completeSocialLogin = (role: 'customer' | 'vendor') => {
    loginAs(role);
    onSuccess?.();
  };

  if (step === 'otp') {
    const displayIdentifier = pendingIdentifier || 'your account';

    return (
      <div className="grid gap-4">
        <form className="grid gap-4" onSubmit={handleOtpSubmit}>
          <div className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
            OTP sent to <span className="font-semibold text-on-surface">{displayIdentifier}</span>
          </div>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">
              Enter OTP
            </span>
            <input
              autoFocus
              className="h-12 rounded-lg border border-neutral-mid-gray px-4 text-center text-xl font-semibold tracking-[0.3em] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              inputMode="numeric"
              maxLength={6}
              name="otp"
              placeholder="123456"
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>

          {formError || error ? (
            <p className="rounded-lg bg-error-container p-3 text-sm text-error">
              {formError || error}
            </p>
          ) : null}

          <Button
            className="h-12 w-full rounded-lg bg-primary-container text-base font-bold text-white shadow-sm hover:bg-primary"
            disabled={otp.length !== 6}
            loading={isLoading}
            type="submit"
          >
            Verify OTP
          </Button>
        </form>

        <button
          className="w-full text-center text-sm font-semibold text-accent-link hover:underline"
          type="button"
          onClick={() => {
            setStep('form');
            setFormError(null);
            clearError();
          }}
        >
          Change email or phone
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {mode === 'login' ? (
        <LoginForm
          redirectTo={redirectTo}
          variant={variant}
          onModeChange={onModeChange}
          onOtpSent={variant === 'modal' ? () => setStep('otp') : undefined}
        />
      ) : (
        <SignupForm
          redirectTo={redirectTo}
          variant={variant}
          onModeChange={onModeChange}
          onSuccess={onSuccess}
        />
      )}

      {variant === 'modal' ? (
        <>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-light-gray" />
            </div>
            <span className="relative bg-white px-4 text-xs font-semibold uppercase text-secondary">
              Or continue with
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-mid-gray px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-neutral-light-gray"
              type="button"
              onClick={() => completeSocialLogin('customer')}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full border border-neutral-mid-gray text-xs font-bold text-primary">
                G
              </span>
              Google
            </button>
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-mid-gray px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-neutral-light-gray"
              type="button"
              onClick={() => completeSocialLogin('vendor')}
            >
              <IdCard aria-hidden="true" className="h-5 w-5" />
              Vendor ID
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
