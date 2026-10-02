import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/login',
}));

vi.mock('@/store/otp-modal.store', () => ({
  useOtpModalStore: (selector: (state: { openOtpModal: () => void }) => unknown) =>
    selector({ openOtpModal: vi.fn() }),
}));

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/store/auth.store';

/**
 * Mocks the store actions directly, same pattern as the `LoginForm.resolveRedirect` suite in
 * auth-security.test.ts — `checkAccountExists` and `sendOtp` are both network-backed store
 * actions, so replacing them here (rather than the underlying `lib/api/endpoints/auth` module)
 * is what the component actually calls.
 */
describe('LoginForm: account-existence gate before sending an OTP', () => {
  const onModeChange = vi.fn();
  const checkAccountExists = vi.fn();
  const sendOtp = vi.fn();

  beforeEach(() => {
    checkAccountExists.mockReset();
    sendOtp.mockReset();
    onModeChange.mockReset();
    useAuthStore.setState({
      checkAccountExists,
      sendOtp,
      isLoading: false,
      error: null,
      errorCode: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function submitIdentifier(identifier: string) {
    render(<LoginForm onModeChange={onModeChange} variant="modal" />);
    fireEvent.change(screen.getByLabelText(/email or phone number/i), {
      target: { value: identifier },
    });
    fireEvent.click(screen.getByRole('button', { name: /send code/i }));
  }

  it('switches to signup without sending an OTP when the identifier has no account', async () => {
    checkAccountExists.mockResolvedValueOnce(false);

    await submitIdentifier('ghost@example.com');

    await waitFor(() => expect(onModeChange).toHaveBeenCalledWith('signup'));
    expect(sendOtp).not.toHaveBeenCalled();
  });

  it('sends an OTP as usual when the identifier has an account', async () => {
    checkAccountExists.mockResolvedValueOnce(true);
    sendOtp.mockResolvedValueOnce(undefined);

    await submitIdentifier('real@example.com');

    await waitFor(() => expect(sendOtp).toHaveBeenCalledWith('real@example.com', 'login'));
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('does not switch to signup or send an OTP when the existence check itself fails', async () => {
    // e.g. a 429 from the new rate limit. checkAccountExists (the store action) is responsible
    // for populating error/errorCode on failure — this only asserts LoginForm's own reaction:
    // it must not treat a thrown check as "no account" and must not still call sendOtp.
    checkAccountExists.mockRejectedValueOnce(new Error('rate limited'));

    await submitIdentifier('anyone@example.com');

    await waitFor(() => expect(checkAccountExists).toHaveBeenCalled());
    expect(sendOtp).not.toHaveBeenCalled();
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
