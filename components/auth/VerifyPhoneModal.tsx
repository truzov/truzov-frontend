'use client';

import { Loader2, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { sendPhoneChangeOtp, verifyPhoneChangeOtp } from '@/lib/api/endpoints/auth';
import { errorMessage } from '@/lib/api/errors';
import { setSession } from '@/lib/api/token-store';
import { isValidRedirect } from '@/lib/auth/redirect';
import { useAuthStore } from '@/store/auth.store';
import { useOtpModalStore } from '@/store/otp-modal.store';

/** This deployment issues 6-digit codes (`truzov.auth.otp.length`). */
const CODE_LENGTH = 6;

/**
 * Verify the phone number already on the account, in a popup rather than a full page.
 *
 * Checkout gates on a verified phone (403 PHONE_NOT_VERIFIED). Instead of routing the user to a
 * standalone /verify-otp screen, this opens over whatever they were doing, sends a code to the
 * number the account already holds, verifies it, and hands them back to where they were.
 *
 * It reuses the authenticated send/verify endpoints the phone-change flow uses
 * (`sendPhoneChangeOtp` / `verifyPhoneChangeOtp`) with `purpose: 'verify'`: the code goes to the
 * caller's own number, the verify call rotates the session, and refreshUser() then re-reads the
 * profile as verified. No new endpoint, no new store beyond the open/close trigger.
 *
 * Mounted once from app/providers.tsx alongside AuthModal.
 */
export function VerifyPhoneModal() {
  const router = useRouter();
  const isOpen = useOtpModalStore((state) => state.isOpen);
  const redirectTo = useOtpModalStore((state) => state.redirectTo);
  const closeOtpModal = useOtpModalStore((state) => state.closeOtpModal);

  const phone = useAuthStore((state) => state.user?.phone);
  const phoneVerified = useAuthStore((state) => state.user?.phoneVerified);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  const [otp, setOtp] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = otp.join('');
  const isComplete = code.length === CODE_LENGTH;

  // Send a code to the account's own number as soon as the modal opens. Guarded so React's
  // strict-mode double effect (and any re-open) does not fire two sends for one session.
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset for next time so a stale code or error never flashes on re-open.
      setOtp(Array(CODE_LENGTH).fill(''));
      setSessionId(null);
      setError(null);
      sendingRef.current = false;
      return;
    }

    if (!phone || sessionId || sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);

    void (async () => {
      try {
        const response = await sendPhoneChangeOtp({ identifier: phone, purpose: 'verify' });
        setSessionId(response.otpSessionId);
        inputRefs.current[0]?.focus();
      } catch (caught) {
        setError(errorMessage(caught));
        // Let the user retry via "Send a new code".
        sendingRef.current = false;
      } finally {
        setSending(false);
      }
    })();
  }, [isOpen, phone, sessionId]);

  const handleChange = (index: number, value: string) => {
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

  async function resend() {
    if (!phone || sending || busy) {
      return;
    }
    setSending(true);
    setError(null);
    setOtp(Array(CODE_LENGTH).fill(''));
    try {
      const response = await sendPhoneChangeOtp({ identifier: phone, purpose: 'verify' });
      setSessionId(response.otpSessionId);
      inputRefs.current[0]?.focus();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (!sessionId || !isComplete) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tokens = await verifyPhoneChangeOtp({ otpSessionId: sessionId, code });
      // The verify call rotates the session; adopt the new tokens before refreshUser reads.
      setSession(tokens);
      await refreshUser();

      const target = isValidRedirect(redirectTo) ? redirectTo : null;
      closeOtpModal();
      if (target) {
        router.push(target);
      }
    } catch (caught) {
      setError(errorMessage(caught));
      setOtp(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  // Already verified (e.g. verified in another tab, or a stale 403): nothing to do.
  if (phoneVerified) {
    closeOtpModal();
    return null;
  }

  return (
    <Modal open={isOpen} title="Verify your phone number" onClose={closeOtpModal}>
      <div className="grid gap-4">
        {phone ? (
          <p className="text-sm text-text-secondary">
            Enter the {CODE_LENGTH}-digit code we sent to{' '}
            <span className="font-medium text-text-primary">{phone}</span>. Orders require a
            verified phone number.
          </p>
        ) : (
          <p className="rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger">
            No phone number is on your account. Add one from your profile, then verify it here.
          </p>
        )}

        {phone ? (
          <>
            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  aria-label={`Digit ${index + 1}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className="h-14 w-12 rounded-lg border border-outline-variant bg-surface-container-lowest text-center text-h3 font-heading text-on-surface shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={busy || sending || !sessionId}
                  inputMode="numeric"
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  type="text"
                  value={digit}
                />
              ))}
            </div>

            {error ? (
              <p className="rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger">
                {error}
              </p>
            ) : null}

            <Button
              disabled={busy || sending || !isComplete || !sessionId}
              loading={busy}
              variant="primary"
              onClick={() => void verify()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone aria-hidden="true" className="h-4 w-4" />}
              Verify & Continue
            </Button>

            <button
              className="text-center text-sm font-body text-primary transition-colors hover:text-primary-container disabled:cursor-not-allowed disabled:opacity-50"
              disabled={sending || busy}
              type="button"
              onClick={() => void resend()}
            >
              {sending ? 'Sending a new code…' : "Didn't receive it? Send a new code"}
            </button>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
