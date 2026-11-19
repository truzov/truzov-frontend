import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';

/**
 * The store calls `verifyOtp` from `lib/api/endpoints/auth.ts`, which is the network boundary —
 * mocking it here exercises the real store branch without needing a live backend, matching how
 * the rest of the suite tests store logic (see tests/utils.test.ts for the equivalent pattern on
 * pure functions).
 */
const { verifyOtpRequest, checkAccountExistsRequest, sendOtpRequest } = vi.hoisted(() => ({
  verifyOtpRequest: vi.fn(),
  checkAccountExistsRequest: vi.fn(),
  sendOtpRequest: vi.fn(),
}));

vi.mock('@/lib/api/endpoints/auth', () => ({
  verifyOtp: verifyOtpRequest,
  checkAccountExists: checkAccountExistsRequest,
  // Only verifyOtp/checkAccountExists are under test; the store module imports several sibling
  // functions from this file, so they need to exist even though nothing here calls them.
  signup: vi.fn(),
  sendOtp: sendOtpRequest,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

import { authActions } from '@/store/auth.store';
import { makeStore } from '@/store/redux';

let store: ReturnType<typeof makeStore>;
beforeEach(() => { store = makeStore(); });

describe('otp/verify: ACCOUNT_NOT_FOUND (404) on a correct code with no account', () => {
  beforeEach(async () => {
    verifyOtpRequest.mockReset();
    sendOtpRequest.mockResolvedValueOnce({ otpSessionId: 'session-abc', channel: 'email', expiresInSeconds: 300 });
    await store.dispatch(authActions.sendOtp('ghost@example.com'));
  });

  it('clears the spent challenge and retains the identifier draft', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'ACCOUNT_NOT_FOUND', message: 'No account.', status: 404 })
    );

    await expect(store.dispatch(authActions.verifyOtp('123456'))).rejects.toThrow();

    const state = store.getState().auth;
    expect(state.errorCode).toBe('ACCOUNT_NOT_FOUND');
    expect(state.hasOtpSession).toBe(false);
    expect(state.pendingIdentifier).toBe('ghost@example.com');
  });

  it('isolates the challenge to its store outside serialized state', async () => {
    const otherStore = makeStore();
    expect(store.getState().auth.hasOtpSession).toBe(true);
    expect(JSON.stringify(store.getState())).not.toContain('session-abc');
    expect(otherStore.getState().auth.hasOtpSession).toBe(false);
    await expect(otherStore.dispatch(authActions.verifyOtp('123456'))).rejects.toMatchObject({ code: 'OTP_SESSION_MISSING' });
    expect(verifyOtpRequest).not.toHaveBeenCalled();
  });

  it('does not log the user in', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'ACCOUNT_NOT_FOUND', message: 'No account.', status: 404 })
    );

    await expect(store.dispatch(authActions.verifyOtp('123456'))).rejects.toThrow();

    const state = store.getState().auth;
    expect(state.isLoggedIn).toBe(false);
    expect(state.status).not.toBe('authenticated');
  });

  it('marks an expired challenge with its separate error code', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'OTP_EXPIRED', message: 'Expired.', status: 410 })
    );

    await expect(store.dispatch(authActions.verifyOtp('123456'))).rejects.toThrow();

    const state = store.getState().auth;
    expect(state.errorCode).toBe('OTP_EXPIRED');
    expect(state.hasOtpSession).toBe(false);
    // The whole point of distinguishing the two codes: OTP_EXPIRED must not trigger the
    // "pre-fill and switch to signup" path meant only for a proven-but-unregistered identifier.
  });

  it('a wrong code (OTP_INVALID) keeps the session open for a retry', async () => {
    verifyOtpRequest.mockRejectedValueOnce(
      new ApiError({ code: 'OTP_INVALID', message: 'Wrong code.', status: 400 })
    );

    await expect(store.dispatch(authActions.verifyOtp('000000'))).rejects.toThrow();

    const state = store.getState().auth;
    expect(state.errorCode).toBe('OTP_INVALID');
    // Unlike OTP_EXPIRED/ACCOUNT_NOT_FOUND, a wrong code must not clear the session — the user
    // can simply retype.
    expect(state.hasOtpSession).toBe(true);
    expect(verifyOtpRequest).toHaveBeenCalledWith({ otpSessionId: 'session-abc', code: '000000' });
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

    await store.dispatch(authActions.verifyOtp('123456'));

    const state = store.getState().auth;
    expect(state.isLoggedIn).toBe(true);
    expect(state.status).toBe('authenticated');
    expect(state.user?.id).toBe('usr_real');
    expect(state.errorCode).toBeNull();
    expect(state.hasOtpSession).toBe(false);
  });
});

describe('auth/account/exists: gating an OTP send on account existence', () => {
  beforeEach(() => {
    checkAccountExistsRequest.mockReset();
  });

  it('returns true and clears errorCode for a registered identifier', async () => {
    checkAccountExistsRequest.mockResolvedValueOnce({ exists: true });

    const result = await store.dispatch(authActions.checkAccountExists('real@example.com'));

    expect(result).toBe(true);
    expect(store.getState().auth.errorCode).toBeNull();
  });

  it('returns false and sets errorCode to ACCOUNT_NOT_FOUND for an unregistered identifier', async () => {
    checkAccountExistsRequest.mockResolvedValueOnce({ exists: false });

    const result = await store.dispatch(authActions.checkAccountExists('ghost@example.com'));

    expect(result).toBe(false);
    // Same code verifyOtp sets on a correct-code-no-account result, so AuthForm's existing
    // "switch to signup" effect fires identically for both entry points.
    expect(store.getState().auth.errorCode).toBe('ACCOUNT_NOT_FOUND');
  });

  it('propagates a rate-limit failure instead of reporting false', async () => {
    checkAccountExistsRequest.mockRejectedValueOnce(
      new ApiError({ code: 'RATE_LIMITED', message: 'Too many attempts.', status: 429 })
    );

    await expect(store.dispatch(authActions.checkAccountExists('anyone@example.com'))).rejects.toThrow();

    // Must not be confused with "no account" — a throttled caller gets no answer at all, not a
    // false one, since a false answer here would (via LoginForm) route straight to signup.
    expect(store.getState().auth.errorCode).toBe('RATE_LIMITED');
  });
});
