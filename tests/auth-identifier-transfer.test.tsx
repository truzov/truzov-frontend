import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuthStore } from '@/store/auth.store';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/auth/GoogleSignInButton', () => ({ GoogleSignInButton: () => null }));

function LoginToSignup() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  return <AuthForm mode={mode} variant="modal" onModeChange={setMode} />;
}

describe('login identifier transfer', () => {
  beforeEach(() => {
    useAuthStore.getState().resetSession();
    // An unrelated earlier OTP must not turn a form draft into verified ownership.
    useAuthStore.setState({ verifiedOtpSessionId: 'old-session', otpSessionId: 'old-otp' });
  });
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
      const fetchMock = vi.fn(
        async (url: string | URL | Request) =>
          new Response(
            JSON.stringify({
              data: String(url).endsWith('/account/exists')
                ? { exists: false }
                : { otpSessionId: 'signup-otp', otpChannel: channel, expiresInSeconds: 300 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
      );
      vi.stubGlobal('fetch', fetchMock);

      render(<LoginToSignup />);
      fireEvent.change(screen.getByLabelText('Email or phone number'), {
        target: { value: identifier },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
      await waitFor(() => expect(screen.getByLabelText(field)).toHaveValue(expected));
      expect(useAuthStore.getState().verifiedOtpSessionId).toBeNull();
      expect(useAuthStore.getState().otpSessionId).toBeNull();
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
      await waitFor(() => expect(useAuthStore.getState().otpSessionId).toBe('signup-otp'));
      expect(useAuthStore.getState().isLoggedIn).toBe(false);
      expect(useAuthStore.getState().pendingIdentifier).toBe(expected);
    }
  );
});
