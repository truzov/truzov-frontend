'use client';

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ERROR_CODES } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';

/** This deployment issues 6-digit codes (`truzov.auth.otp.length`). */
const CODE_LENGTH = 6;

/**
 * OTP entry for both signup verification and OTP login.
 *
 * Behaviour worth knowing:
 *  - The two documented failures are handled differently. A wrong code (400 OTP_INVALID) keeps
 *    the session alive so the user can simply retype. An expired or already-used session
 *    (410 OTP_EXPIRED) cannot succeed no matter what is typed, so the form switches to asking
 *    for a new code. The old version treated both as "try again", which left users retyping
 *    into a dead session.
 *  - Copy follows the channel the server actually used. It used to be hardcoded to "email"
 *    while the default channel is phone.
 */
export function OTPVerification({ onVerified }: { onVerified?: () => void } = {}) {
  const router = useRouter();
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const sendOtp = useAuthStore((state) => state.sendOtp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const errorCode = useAuthStore((state) => state.errorCode);
  const pendingIdentifier = useAuthStore((state) => state.pendingIdentifier);
  const otpChannel = useAuthStore((state) => state.otpChannel);
  const otpSessionId = useAuthStore((state) => state.otpSessionId);
  const otpExpiresInSeconds = useAuthStore((state) => state.otpExpiresInSeconds);

  const [otp, setOtp] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const redirectParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirect')
      : null;

  const channelLabel = otpChannel === 'email' ? 'email' : 'phone';
  // True in two situations the client CANNOT tell apart, plus one it can:
  //   - 410 OTP_EXPIRED: the session really is expired or already used;
  //   - 410 OTP_EXPIRED: the identifier has no account, so the session was never able to
  //     authenticate anyone. The backend returns the identical status and code on purpose, so
  //     that otp/verify is not an account-existence oracle (AuthService, control H-3);
  //   - no session id at all, e.g. this screen was opened directly or after a reload, since the
  //     auth store is in-memory.
  // All three mean "typing a code here cannot succeed", which is why the inputs are disabled.
  // The recovery UI below therefore offers a resend AND a signup link, because it does not know
  // which of the first two applies and only the user does.
  const sessionExpired = errorCode === ERROR_CODES.OTP_EXPIRED || !otpSessionId;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => setResendCooldown((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Paste support: a pasted 6-digit code lands in one input, so spread it across the boxes
    // instead of keeping only the last character.
    const digits = value.replace(/\D/g, '');

    if (digits.length > 1) {
      const next = Array(CODE_LENGTH).fill('');
      digits
        .slice(0, CODE_LENGTH)
        .split('')
        .forEach((digit, offset) => {
          next[offset] = digit;
        });
      setOtp(next);
      inputRefs.current[Math.min(digits.length, CODE_LENGTH - 1)]?.focus();
      return;
    }

    const next = [...otp];
    next[index] = digits.slice(-1);
    setOtp(next);

    if (digits && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = otp.join('');

    if (code.length !== CODE_LENGTH) {
      return;
    }

    try {
      await verifyOtp(code);

      // In the modal there is nowhere to navigate to — the caller closes the dialog and handles
      // its own redirect. On the standalone page we navigate. Same verification logic either
      // way, which is why the modal no longer carries a second copy of this form.
      if (onVerified) {
        onVerified();
        return;
      }

      // Tokens are set by the store, so the destination is immediately reachable.
      router.push(redirectParam || '/');
    } catch {
      // Clear the boxes only for a wrong code, where retyping is the fix. On an expired session
      // the form shows the "request a new code" path instead.
      setOtp(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!pendingIdentifier || resendCooldown > 0) {
      return;
    }

    try {
      await sendOtp(pendingIdentifier, 'login');
      setOtp(Array(CODE_LENGTH).fill(''));
      // Cooldown derived from the server's own TTL rather than a hardcoded 30s, so it cannot
      // contradict how long the code is actually valid.
      setResendCooldown(Math.min(otpExpiresInSeconds ?? 30, 60));
      inputRefs.current[0]?.focus();
    } catch {
      // Rendered from the store.
    }
  };

  const isComplete = otp.every((digit) => digit !== '');

  return (
    <form className="flex w-full flex-col space-y-lg" onSubmit={handleSubmit}>
      <div className="flex flex-col space-y-xs">
        <span className="text-h6 font-bold font-body text-on-surface">
          {otpChannel === 'email' ? 'Email' : 'Phone number'}
        </span>
        <div className="flex items-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md focus-within:ring-1 focus-within:ring-primary">
          <span className="truncate text-body-md font-body text-on-surface">
            {pendingIdentifier || 'No pending verification'}
          </span>
        </div>
      </div>

      <div className="flex flex-col space-y-xs">
        <span className="text-h6 font-bold font-body text-on-surface">Verification Code</span>
        <p className="text-caption font-body text-on-surface-variant">
          Enter the {CODE_LENGTH}-digit code sent to your {channelLabel}
        </p>
        <div className="flex justify-between gap-xs md:gap-sm">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              aria-label={`Digit ${index + 1}`}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              className="h-14 w-12 rounded-lg border border-outline-variant bg-surface-container-lowest text-center text-h3 font-heading text-on-surface shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:h-16 md:w-14"
              disabled={sessionExpired}
              inputMode="numeric"
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              type="text"
              value={digit}
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-error-container p-sm text-caption text-error">{error}</p>
      ) : null}

      {sessionExpired ? (
        <>
          <button
            className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-h5 font-bold font-body text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || !pendingIdentifier}
            type="button"
            onClick={() => void handleResend()}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Send a new code
          </button>

          {/*
            Both routes out are offered because the client genuinely cannot tell which of two
            causes it is looking at. The backend returns the SAME 410 OTP_EXPIRED for a session
            that really has expired AND for one opened against an identifier with no account —
            deliberately, so that otp/verify cannot be used to discover which phone numbers and
            email addresses are registered (see AuthService, control H-3).

            Offering only "send a new code" therefore strands anyone who has not signed up: every
            new code they request fails identically, with the screen insisting the session is
            invalid when the real answer is that there is no account. Naming both possibilities
            costs nothing and leaks nothing, because the user is the one who knows which applies.
          */}
          <p className="text-center text-caption text-on-surface-variant">
            Not signed up with this {channelLabel} yet?{' '}
            <Link className="font-semibold text-primary hover:underline" href="/signup">
              Create an account
            </Link>
          </p>
        </>
      ) : (
        <button
          className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-h5 font-bold font-body text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isComplete || isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify &amp; Proceed
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      )}

      <div className="mt-lg flex flex-col items-center gap-md">
        {!sessionExpired ? (
          <button
            className="cursor-pointer border-none bg-transparent text-body-md font-body text-primary transition-colors hover:text-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            disabled={resendCooldown > 0 || isLoading || !pendingIdentifier}
            type="button"
            onClick={() => void handleResend()}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Didn't receive the code? Resend"}
          </button>
        ) : null}
        <Link
          className="flex items-center gap-xs text-body-md font-body text-on-surface-variant transition-colors hover:text-on-surface"
          href={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
      </div>
    </form>
  );
}
