'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { GoogleSignInButton } from './GoogleSignInButton';
import { LoginForm } from './LoginForm';
import { OTPVerification } from './OTPVerification';
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

/**
 * Shell that switches between the login/signup forms and the OTP step.
 *
 * Two things were removed here:
 *
 * 1. Its own duplicate OTP form. There were two independent OTP implementations (this one and
 *    OTPVerification) with different error handling, so a fix to one silently missed the other.
 *    It now renders OTPVerification, which is the single verification path.
 * 2. The "Google" and "Vendor ID" buttons. They called `loginAs(role)`, which granted a session
 *    with no credentials and let the CLIENT choose its own role. There is no OAuth endpoint in
 *    the API, so there was nothing behind them to wire up (plan §6.5).
 *
 * Google sign-in is back as of `POST /auth/oauth/google`, but as a real redirect flow this time:
 * see GoogleSignInButton. The "Vendor ID" button stays gone — the server decides roles.
 */
export function AuthForm({
  mode,
  variant = 'page',
  redirectTo,
  onSuccess,
  onModeChange,
}: AuthFormProps) {
  const clearError = useAuthStore((state) => state.clearError);
  const [step, setStep] = useState<AuthStep>('form');

  // Switching between login and signup resets the flow, so a stale OTP step or a previous
  // mode's error message does not carry across.
  useEffect(() => {
    setStep('form');
    clearError();
  }, [clearError, mode]);

  if (step === 'otp') {
    return (
      <div className="grid gap-4">
        <OTPVerification onVerified={onSuccess} />
        <button
          className="w-full text-center text-sm font-semibold text-accent-link hover:underline"
          type="button"
          onClick={() => {
            setStep('form');
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
      {/*
        `onOtpSent` is passed ONLY for the modal. On a page there is a dedicated /verify-otp route,
        and using an in-place step there would leave the URL reading /signup while showing an OTP
        form — so a reload or a shared link would lose the pending session. The modal has nowhere to
        navigate to, which is why it keeps the in-place step.
      */}
      {mode === 'login' ? (
        <LoginForm
          redirectTo={redirectTo}
          variant={variant}
          onModeChange={onModeChange}
          onOtpSent={variant === 'modal' ? () => setStep('otp') : undefined}
          onSuccess={onSuccess}
        />
      ) : (
        <SignupForm
          redirectTo={redirectTo}
          variant={variant}
          onModeChange={onModeChange}
          // Signup returns no tokens, so success here means "code sent", not "signed in".
          onOtpSent={variant === 'modal' ? () => setStep('otp') : undefined}
        />
      )}

      {/*
        Shown for both modes because one Google flow serves both: the API creates an account or
        links an existing one from the same call, so there is no separate "sign up with Google".
        Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset.
      */}
      <GoogleSignInButton redirectTo={redirectTo} />
    </div>
  );
}
