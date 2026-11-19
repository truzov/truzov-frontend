import React, { useState } from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithRedux as render } from './redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '@/components/auth/AuthForm';
import { authActions } from '@/store/auth.store';
import { makeStore } from '@/store/redux';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/auth/GoogleSignInButton', () => ({ GoogleSignInButton: () => null }));

function LoginToSignup() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  return <AuthForm mode={mode} variant="modal" onModeChange={setMode} />;
}

describe('login identifier transfer', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ['new@example.com', 'Email address', 'new@example.com', 'email'],
    ['98765 43210', 'Phone number', '9876543210', 'phone'],
  ])(
    'prefills %s and still requires signup verification',
    async (identifier, field, expected, channel) => {
      const store = makeStore();
      const fetchMock = vi.fn(
        async (url: string | URL | Request) =>
          new Response(
            JSON.stringify({
              data: String(url).endsWith('/account/exists')
                ? { exists: false }
                : String(url).endsWith('/otp/send')
                  ? { otpSessionId: 'old-otp', channel, expiresInSeconds: 300 }
                  : { otpSessionId: 'signup-otp', otpChannel: channel, expiresInSeconds: 300 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
      );
      vi.stubGlobal('fetch', fetchMock);

      // An unrelated earlier challenge cannot make a form draft into verified ownership.
      await store.dispatch(authActions.sendOtp('other@example.com'));
      fetchMock.mockClear();
      render(<LoginToSignup />, { store });
      fireEvent.change(screen.getByLabelText('Email or phone number'), {
        target: { value: identifier },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
      await waitFor(() => expect(screen.getByLabelText(field)).toHaveValue(expected));
      expect(store.getState().auth.hasOtpSession).toBe(false);
      expect(fetchMock.mock.calls).toHaveLength(1);

      fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha Singh' } });
      if (channel === 'email') {
        fireEvent.change(screen.getByLabelText('Phone number'), {
          target: { value: '9876543210' },
        });
      }
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
      fireEvent.change(screen.getByLabelText('Confirm password'), {
        target: { value: 'secret123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      await waitFor(() => expect(store.getState().auth.hasOtpSession).toBe(true));
      expect(store.getState().auth.isLoggedIn).toBe(false);
      expect(store.getState().auth.pendingIdentifier).toBe(expected);
    }
  );
});
