'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { confirmPasswordReset, requestPasswordReset } from '@/lib/api/endpoints/auth';
import { loginIdentifierSchema, otpSchema, passwordSchema } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/auth.store';
import { clearSession } from '@/lib/api/token-store';
import { useUiStore } from '@/store/ui.store';

export function ResetPasswordScreen() {
  const router = useRouter();
  const [session, setSession] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const identifier = loginIdentifierSchema.safeParse(values.get('identifier'));
    const password = passwordSchema.safeParse(values.get('password'));
    const code = otpSchema.safeParse({ code: values.get('code') });
    if (!session && !identifier.success) { setError(identifier.error.issues[0].message); return; }
    if (session && (!password.success || !code.success || values.get('password') !== values.get('confirmPassword'))) {
      setError(!password.success ? password.error.issues[0].message : !code.success ? code.error.issues[0].message : "Passwords don't match");
      return;
    }
    busy.current = true; setPending(true); setError(null);
    try {
      if (!session && identifier.success) {
        const result = await requestPasswordReset(identifier.data);
        setSession(result.otpSessionId);
        form.reset();
      } else if (session && password.success && code.success) {
        await confirmPasswordReset({ otpSessionId: session, code: code.data.code, password: password.data });
        clearSession('logout');
        useAuthStore.getState().resetSession();
        setSession(null); form.reset();
        useUiStore.getState().addToast({ type: 'success', title: 'Your password has been changed. Sign in with your new password.' });
        router.replace('/login');
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not reset your password. Please try again.'); }
    finally { busy.current = false; setPending(false); }
  }

  return <section className="auth-surface mx-auto min-h-screen max-w-lg px-5 py-12">
    <h1 className="text-3xl">Reset password</h1>
    <>
      <p className="my-5">{session ? 'If the account can receive codes, a verification code is on its way. Enter it with your new password.' : 'Enter your email or phone. If it matches an account, we’ll send a verification code.'}</p>
      <form onSubmit={submit}><fieldset disabled={pending} className="grid gap-4">
        {!session ? <Input label="Email or phone number" name="identifier" autoComplete="username" maxLength={255} required /> : <>
          <Input label="Verification code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,10}" maxLength={10} required />
          <Input label="New password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          <p className="text-sm">Use 8–128 characters with at least one letter and one number.</p>
          <Input label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required />
        </>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <Button type="submit">{pending ? 'Please wait…' : session ? 'Reset password' : 'Send verification code'}</Button>
        {session && <Button type="button" variant="outline" onClick={() => { setSession(null); setError(null); }}>Use a different identifier or request a new code</Button>}
      </fieldset></form>
      <Link className="mt-5 inline-flex min-h-11 items-center underline" href="/login">Back to login</Link>
    </>
  </section>;
}
