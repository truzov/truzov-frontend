'use client';

import { useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { sendPhoneChangeOtp, verifyPhoneChangeOtp } from '@/lib/api/endpoints/auth';
import { errorMessage } from '@/lib/api/errors';
import { setSession } from '@/lib/api/token-store';
import { accountPhone } from '@/lib/auth/phone';
import { useAuthStore } from '@/store/auth.store';

/** Same rule the signup form enforces: 10 digits, or E.164 with a leading +. */
const PHONE_PATTERN = /^(?:\d{10}|\+[1-9]\d{7,14})$/;
const CODE_LENGTH = 6;

/**
 * OTP-verified phone-number change (spec §6).
 *
 * `PATCH /users/me` no longer accepts a changed phone — the phone is the identifier
 * transactional flows gate on, so moving it now requires proving the NEW number the
 * same way the first one was proven: a code sent to it, verified while signed in.
 * The server owns the new number's uniqueness (409), the ownership of the change
 * session (410 for anyone but the requester), and stamps the number verified in the
 * same write that adopts it.
 */
export function PhoneChangeModal({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified?: () => void }) {
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const currentPhone = useAuthStore((state) => accountPhone(state.user?.phone));

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep('phone');
    setNewPhone('');
    setCode('');
    setSessionId(null);
    setError(null);
  }

  function close() {
    onClose();
    reset();
  }

  async function sendCode() {
    if (busy) return;
    const normalised = newPhone.replace(/[\s().-]/g, '');
    if (!PHONE_PATTERN.test(normalised)) {
      setError('Enter a valid 10-digit or international mobile number.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await sendPhoneChangeOtp({
        identifier: normalised,
        purpose: 'phone_change',
      });
      setSessionId(response.otpSessionId);
      setCode('');
      setNewPhone(normalised);
      setStep('code');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (busy || !sessionId || code.length !== CODE_LENGTH) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const tokens = await verifyPhoneChangeOtp({ otpSessionId: sessionId, code });
      // The verify call rotates the session, so adopt the new tokens before the
      // profile refresh below reads with them.
      setSession(tokens);
      await refreshUser();
      close();
      onVerified?.();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={currentPhone ? 'Change mobile number' : 'Add mobile number'} onClose={() => { if (!busy) close(); }}>
      <div className="grid gap-4">
        {step === 'phone' ? (
          <>
            {currentPhone ? (
              <p className="text-sm text-text-secondary">
                Current number: <span className="font-medium text-text-primary">{currentPhone}</span>
              </p>
            ) : null}
            <Input
              label="New Mobile Number"
              placeholder="9876543210"
              type="tel"
              inputMode="tel"
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
            />
            <p className="text-xs text-text-secondary">
              We&apos;ll send a verification code to the new number. It must not already be
              registered, and it replaces your current number only after the code is verified.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
                Code sent to <span className="font-medium text-text-primary">{newPhone}</span>. Not verified yet.
            </p>
            <Input
              label="Verification Code"
              placeholder={`Enter the ${CODE_LENGTH}-digit code`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            />
            <button
              disabled={busy}
              className="text-left text-sm text-accent-link hover:underline"
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
            >
              Use a different number
            </button>
            <button type="button" disabled={busy} className="text-left text-sm text-accent-link hover:underline" onClick={() => void sendCode()}>
              Resend code
            </button>
          </>
        )}

        {error ? (
          <p role="alert" className="rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger">
            {error}
          </p>
        ) : null}

        <Button
          className="uppercase tracking-wider"
          disabled={busy || (step === 'code' && code.length !== CODE_LENGTH)}
          loading={busy}
          variant="primary"
          onClick={() => (step === 'phone' ? void sendCode() : void verify())}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone aria-hidden="true" className="h-4 w-4" />
          )}
          {step === 'phone' ? 'Send Code' : 'Verify & Update'}
        </Button>
      </div>
    </Modal>
  );
}
