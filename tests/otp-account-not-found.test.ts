import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';

/**
 * The store calls `verifyOtp` from `lib/api/endpoints/auth.ts`, which is the network boundary —
 * mocking it here exercises the real store branch without needing a live backend, matching how
 * the rest of the suite tests store logic (see tests/utils.test.ts for the equivalent pattern on
 * pure functions).
 */
const { verifyOtpRequest } = vi.hoisted(() => ({
  verifyOtpRequest: vi.fn(),
}));

vi.mock('@/lib/api/endpoints/auth', () => ({
  verifyOtp: verifyOtpRequest,
  // Only verifyOtp is under test; the store module imports several sibling functions from this
  // file, so they need to exist even though nothing here calls them.
  signup: vi.fn(),
  sendOtp: vi.fn(),
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

import { useAuthStore } from '@/store/auth.store';

describe('otp/verify: ACCOUNT_NOT_FOUND (404) on a correct code with no account', () => {
  beforeEach(() => {
    verifyOtpRequest.mockReset();
    useAuthStore.setState({
      otpSessionId: 'session-abc',
      pendingIdentifier: 'ghost@example.com',
      otpChannel: 'email',
      verifiedOtpSessionId: null,
      errorCode: null,
      error: null,
      status: 'anonymous',
      isLoggedIn: false,
    });
  });

  it('holds the consumed session as a signup voucher and clears otpSessionId', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'ACCOUNT_NOT_FOUND', message: 'No account.', status: 404 })
    );

    await expect(useAuthStore.getState().verifyOtp('123456')).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.errorCode).toBe('ACCOUNT_NOT_FOUND');
    // The spent session can never verify anything else, so it must not linger as otpSessionId —
    // only OTPVerification's `sessionExpired`/`accountNotFound` derivation should see it now.
    expect(state.otpSessionId).toBeNull();
    // ...but it is kept under a different name so SignupForm can pre-fill from it and carry it
    // forward (though signup still requires a fresh OTP — nothing here skips verification).
    expect(state.verifiedOtpSessionId).toBe('session-abc');
  });

  it('does not log the user in', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'ACCOUNT_NOT_FOUND', message: 'No account.', status: 404 })
    );

    await expect(useAuthStore.getState().verifyOtp('123456')).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.status).not.toBe('authenticated');
  });

  it('is distinct from OTP_EXPIRED: an expired session does not become a signup voucher', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'OTP_EXPIRED', message: 'Expired.', status: 410 })
    );

    await expect(useAuthStore.getState().verifyOtp('123456')).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.errorCode).toBe('OTP_EXPIRED');
    expect(state.otpSessionId).toBeNull();
    // The whole point of distinguishing the two codes: OTP_EXPIRED must not trigger the
    // "pre-fill and switch to signup" path meant only for a proven-but-unregistered identifier.
    expect(state.verifiedOtpSessionId).toBeNull();
  });

  it('a wrong code (OTP_INVALID) keeps the session open for a retry', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'OTP_INVALID', message: 'Wrong code.', status: 400 })
    );

    await expect(useAuthStore.getState().verifyOtp('000000')).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.errorCode).toBe('OTP_INVALID');
    // Unlike OTP_EXPIRED/ACCOUNT_NOT_FOUND, a wrong code must not clear the session — the user
    // can simply retype.
    expect(state.otpSessionId).toBe('session-abc');
    expect(state.verifiedOtpSessionId).toBeNull();
  });

  it('a real account still logs in normally — the new branch only fires on a null userId', async () => {
    // Regression guard for "confirm existing login flow for users WITH accounts still works":
    // this exercises the success path the backend takes when consumed.getUserId() is non-null,
    // which never reaches the AccountNotFoundException branch at all.
    verifyOtpRequest.mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'usr_real',
        name: 'Real User',
        email: 'real@example.com',
        phone: '9876543210',
        role: 'customer',
        emailVerified: true,
        phoneVerified: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    });

    await useAuthStore.getState().verifyOtp('123456');

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.status).toBe('authenticated');
    expect(state.user?.id).toBe('usr_real');
    expect(state.errorCode).toBeNull();
    expect(state.otpSessionId).toBeNull();
    expect(state.verifiedOtpSessionId).toBeNull();
  });
});
