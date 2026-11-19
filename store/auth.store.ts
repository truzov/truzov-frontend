'use client';

import { bindActionCreators, createSlice, type PayloadAction, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { AppStore, RootState } from '@/store/redux';
import { emitAuthEvent } from '@/lib/api/auth-events';
import {
  checkAccountExists as checkAccountExistsRequest,
  getCurrentUser,
  login as loginRequest,
  loginWithGoogle as loginWithGoogleRequest,
  logout as logoutRequest,
  sendOtp as sendOtpRequest,
  signup as signupRequest,
  updateProfile as updateProfileRequest,
  verifyOtp as verifyOtpRequest,
} from '@/lib/api/endpoints/auth';
import { ApiError, errorMessage, isApiError } from '@/lib/api/errors';
import {
  canRestoreSession,
  clearSession,
  getRefreshToken,
  setSession,
} from '@/lib/api/token-store';
import type { ToastMessage } from '@/store/ui.store';
import type { OtpChannel, SignupRequest, SignupResponse, UpdateProfileRequest, UserProfileDto } from '@/types/api';

/**
 * Where we are in the boot sequence. This exists to fix a real bug rather than for tidiness.
 *
 * The previous store persisted `isLoggedIn` to localStorage and started `isLoading: false`, so
 * on a hard refresh `useProtectedRoute` saw "not loading, not logged in" for the first render
 * and redirected a perfectly valid session to /login. Restoring a session requires a network
 * round trip (refresh + /auth/me), so there has to be a state that means "we do not know yet",
 * and guards must wait for it.
 *
 *  idle         - nothing attempted yet
 *  restoring    - refresh/-me in flight; guards must wait, not redirect
 *  authenticated- confirmed by the server this page load
 *  anonymous    - confirmed no usable session
 */
export type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: UserProfileDto | null;
  /** Derived from `status`, never persisted. True only once the server has confirmed. */
  isLoggedIn: boolean;
  /** In-flight flag for user-initiated auth actions (submit buttons), not for session restore. */
  isLoading: boolean;
  error: string | null;
  /** Lets a screen distinguish e.g. OTP_INVALID (retry) from OTP_EXPIRED (start over). */
  errorCode: string | null;

  /** True while a challenge is available in the store runtime. */
  hasOtpSession: boolean;
  otpChannel: OtpChannel | null;
  /** Shown back to the user ("code sent to ..."), and reused for resend. */
  pendingIdentifier: string | null;
  /** Server-provided lifetime; drives the resend cooldown instead of a hardcoded 30s. */
  otpExpiresInSeconds: number | null;
}

/** Shape shared by every "an auth call failed" path. */
function toErrorState(error: unknown): Pick<AuthState, 'error' | 'errorCode' | 'isLoading'> {
  return {
    error: errorMessage(error),
    errorCode: isApiError(error) ? error.code : null,
    isLoading: false,
  };
}

/**
 * The toast for a failed login attempt.
 *
 * The title always carries the fixed wording and the server's words go in the toast's `message`
 * slot, which is why "show the backend message" and "read 'Login failed'" do not fight each
 * other — both are present. `status === 0` is the client-side marker for a request that never
 * reached the server (NETWORK_ERROR / TIMEOUT from `lib/api/client.ts`).
 *
 * Nothing local is interpolated: the output text is only ever one of the two fixed titles plus a
 * prefix of the error's own message, so no access token, password or OTP code can reach a toast.
 * The 200-character cap is a display bound, not a sanitiser — `Toaster` renders it as JSX text.
 *
 * Exported so the property test can reach it directly.
 */
export function loginFailureToast(error: unknown): Omit<ToastMessage, 'id'> {
  const api = isApiError(error) ? error : null;

  if (api?.status === 0) {
    return { type: 'error', title: 'Network error, please try again' };
  }

  const message = api?.message?.trim();

  return {
    type: 'error',
    title: 'Login failed',
    message: message ? message.slice(0, 200) : undefined,
  };
}

const CLEARED_OTP = {
  hasOtpSession: false,
  otpChannel: null,
  pendingIdentifier: null,
  otpExpiresInSeconds: null,
} as const;

const initialState: AuthState = {
  status: 'idle',
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
  errorCode: null,
  ...CLEARED_OTP,
};

const auth = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authChanged: (state, { payload }: PayloadAction<Partial<AuthState>>) => Object.assign(state, payload),
  },
});

export const authReducer = auth.reducer;
export const { authChanged } = auth.actions;

export interface AuthRuntime {
  otpSessionId: string | null;
}

type AuthThunk<Result = void> = ThunkAction<Result, RootState, AuthRuntime, UnknownAction>;

// ponytail: hand-written thunks keep credentials in closures, outside Redux action payloads.
export const authActions = {
  restoreSession: (): AuthThunk<Promise<void>> => async (dispatch, getState) => {
    // Nothing to restore: no refresh token means no session to recover, so skip the round trip.
    if (!canRestoreSession() && !getState().auth.isLoggedIn) {
      if (!getRefreshToken()) {
        dispatch(authChanged({ status: 'anonymous', user: null, isLoggedIn: false }));
        return;
      }
    }

    // Guard against a second call while one is in flight (React strict mode double-invokes
    // effects in development, and two /auth/me calls would race).
    if (getState().auth.status === 'restoring') {
      return;
    }

    dispatch(authChanged({ status: 'restoring' }));

    try {
      // Sent with no access token in hand: the server answers 401, and the client's
      // refresh-then-retry-once path exchanges the stored refresh token for a live pair. That
      // is the whole session-restore mechanism — there is no separate "restore" endpoint.
      const user = await getCurrentUser();
      dispatch(authChanged({ status: 'authenticated', user, isLoggedIn: true }));
    } catch {
      // Refresh token missing, expired, or already rotated away. Not an error worth showing:
      // from the user's point of view they are simply signed out.
      clearSession('unauthorized', { silent: true });
      dispatch(authChanged({ status: 'anonymous', user: null, isLoggedIn: false }));
    }
  },

  signup: ({ fullName, phone, password, email, otpChannel = 'phone' }: SignupRequest): AuthThunk<Promise<SignupResponse>> => async (dispatch, _getState, runtime) => {
    dispatch(authChanged({ isLoading: true, error: null, errorCode: null }));

    try {
      const response = await signupRequest({
        fullName,
        phone,
        password,
        // Omitted rather than sent as an empty string: the backend validates it as an email
        // when present, so '' would be a validation failure on an optional field.
        email: email?.trim() ? email.trim() : undefined,
        otpChannel,
      });

      // Signup returns NO tokens and ALWAYS requires OTP verification: the account is created
      // unverified and stays unusable (login refuses it with ACCOUNT_NOT_VERIFIED) until the
      // code sent to the chosen channel is entered on the next step. Even when the user came
      // from the ACCOUNT_NOT_FOUND flow, they still verify here — no code is skipped.
      runtime.otpSessionId = response.otpSessionId;
      dispatch(authChanged({
        isLoading: false,
        hasOtpSession: Boolean(response.otpSessionId),
        otpChannel: response.otpChannel,
        pendingIdentifier: otpChannel === 'email' ? (email?.trim() ?? phone) : phone,
        otpExpiresInSeconds: response.expiresInSeconds,
      }));
      return response;
    } catch (error) {
      dispatch(authChanged(toErrorState(error)));
      throw error;
    }
  },

  sendOtp: (identifier: string, purpose: 'login' | 'verify' = 'login'): AuthThunk<Promise<void>> => async (dispatch, _getState, runtime) => {
    dispatch(authChanged({ isLoading: true, error: null, errorCode: null }));

    // Phone numbers are entered with spaces, dashes and brackets; email is not. Only strip
    // non-digits when the value is clearly not an email, or "a@b.com" would become "".
    const trimmed = identifier.trim();
    const normalised = trimmed.includes('@') ? trimmed : trimmed.replace(/[^\d+]/g, '');

    try {
      const response = await sendOtpRequest({ identifier: normalised, purpose });
      runtime.otpSessionId = response.otpSessionId;
      dispatch(authChanged({
        isLoading: false,
        hasOtpSession: Boolean(response.otpSessionId),
        otpChannel: response.channel,
        pendingIdentifier: normalised,
        otpExpiresInSeconds: response.expiresInSeconds,
      }));
    } catch (error) {
      dispatch(authChanged(toErrorState(error)));
      throw error;
    }
  },

  checkAccountExists: (identifier: string): AuthThunk<Promise<boolean>> => async (dispatch, _getState, runtime) => {
    dispatch(authChanged({ isLoading: true, error: null, errorCode: null }));
    const trimmed = identifier.trim();
    const normalised = trimmed.includes('@') ? trimmed : trimmed.replace(/[^\d+]/g, '');

    try {
      const { exists } = await checkAccountExistsRequest(normalised);
      // Mirrors verifyOtp's ACCOUNT_NOT_FOUND handling so AuthForm's existing
      // "switch to signup" effect fires the same way for both entry points.
      runtime.otpSessionId = null;
      dispatch(authChanged({
        ...CLEARED_OTP,
        isLoading: false,
        errorCode: exists ? null : 'ACCOUNT_NOT_FOUND',
        pendingIdentifier: normalised,
        otpChannel: normalised.includes('@') ? 'email' : 'phone',
      }));
      return exists;
    } catch (error) {
      dispatch(authChanged(toErrorState(error)));
      throw error;
    }
  },

  verifyOtp: (code: string): AuthThunk<Promise<void>> => async (dispatch, _getState, runtime) => {
    const { otpSessionId } = runtime;

    if (!otpSessionId) {
      const error = new ApiError({
        code: 'OTP_SESSION_MISSING',
        message: 'That verification session has gone. Please request a new code.',
        status: 0,
      });
      dispatch(authChanged(toErrorState(error)));
      throw error;
    }

    dispatch(authChanged({ isLoading: true, error: null, errorCode: null }));

    try {
      const tokens = await verifyOtpRequest({ otpSessionId, code });
      setSession(tokens);
      runtime.otpSessionId = null;
      dispatch(authChanged({
        status: 'authenticated',
        user: tokens.user,
        isLoggedIn: true,
        isLoading: false,
        ...CLEARED_OTP,
      }));
      emitAuthEvent({ type: 'toast', toast: { type: 'success', title: 'Login successful' } });
    } catch (error) {
      emitAuthEvent({ type: 'toast', toast: loginFailureToast(error) });

      // OTP_EXPIRED (410) means the session is spent, so drop it — leaving it in place would
      // let the user keep submitting codes against a session that can never succeed. A wrong
      // code (400 OTP_INVALID) keeps the session so they can simply try again.
      if (isApiError(error) && (error.code === 'OTP_EXPIRED' || error.code === 'ACCOUNT_NOT_FOUND')) {
        runtime.otpSessionId = null;
        dispatch(authChanged({ ...toErrorState(error), hasOtpSession: false }));
      } else {
        dispatch(authChanged(toErrorState(error)));
      }
      throw error;
    }
  },

  loginWithPassword: (identifier: string, password: string): AuthThunk<Promise<void>> => async (dispatch, _getState, runtime) => {
    dispatch(authChanged({ isLoading: true, error: null, errorCode: null }));

    try {
      const tokens = await loginRequest({ identifier: identifier.trim(), password });
      setSession(tokens);
      runtime.otpSessionId = null;
      dispatch(authChanged({
        status: 'authenticated',
        // Role comes from the server. The client never decides it.
        user: tokens.user,
        isLoggedIn: true,
        isLoading: false,
        ...CLEARED_OTP,
      }));
      emitAuthEvent({ type: 'toast', toast: { type: 'success', title: 'Login successful' } });
    } catch (error) {
      emitAuthEvent({ type: 'toast', toast: loginFailureToast(error) });
      dispatch(authChanged(toErrorState(error)));
      throw error;
    }
  },

  /**
   * Completes a Google redirect. The code and verifier come from the callback route; the server
   * does the exchange, so there is nothing to validate here beyond what the API returns.
   *
   * Sets the same authenticated state as a password login — deliberately, so no screen has to
   * care which path produced the session.
   */
  loginWithGoogle: (code: string, codeVerifier: string): AuthThunk<Promise<void>> => async (dispatch, _getState, runtime) => {
    dispatch(authChanged({ isLoading: true, error: null, errorCode: null }));

    try {
      const tokens = await loginWithGoogleRequest({ code, codeVerifier });
      setSession(tokens);
      runtime.otpSessionId = null;
      dispatch(authChanged({
        status: 'authenticated',
        user: tokens.user,
        isLoggedIn: true,
        isLoading: false,
        ...CLEARED_OTP,
      }));
      emitAuthEvent({ type: 'toast', toast: { type: 'success', title: 'Login successful' } });
    } catch (error) {
      emitAuthEvent({ type: 'toast', toast: loginFailureToast(error) });
      dispatch(authChanged(toErrorState(error)));
      throw error;
    }
  },

  updateProfile: (updates: UpdateProfileRequest): AuthThunk<Promise<void>> => async (dispatch) => {
    dispatch(authChanged({ isLoading: true, error: null, errorCode: null }));

    try {
      const user = await updateProfileRequest(updates);
      // Replace wholesale rather than merging: changing email or phone clears that channel's
      // verification flag server-side, and a merge would keep the stale `emailVerified: true`.
      dispatch(authChanged({ user, isLoading: false }));
    } catch (error) {
      dispatch(authChanged(toErrorState(error)));
      throw error;
    }
  },

  refreshUser: (): AuthThunk<Promise<void>> => async (dispatch) => {
    try {
      const user = await getCurrentUser();
      dispatch(authChanged({ user, status: 'authenticated', isLoggedIn: true }));
    } catch {
      // Background revalidation. A failure here is handled by the client's own 401 path; there
      // is nothing useful to show the user for a refresh they did not ask for.
    }
  },

  logout: (): AuthThunk<Promise<void>> => async (dispatch, _getState, runtime) => {
    const refreshToken = getRefreshToken();

    try {
      // Send the refresh token so the session is actually revoked server-side. Without it the
      // token stays valid until expiry, and "log out" would only be a local gesture.
      await logoutRequest(refreshToken ? { refreshToken } : {});
    } catch {
      // Deliberately ignored. A network failure must never leave the user stuck in a
      // logged-in UI; local teardown below is what they asked for.
    } finally {
      // NOT `silent`: `session-cleared` is the only thing that makes AuthEventBridge run
      // `queryClient.clear()`, and without it an explicit logout left the previous user's cart,
      // orders, addresses and wishlist readable in the React Query cache. The bridge clears the
      // cache BEFORE its `if (event.reason === 'logout') return;`, so emitting here adds no
      // competing navigation.
      clearSession('logout');
      runtime.otpSessionId = null;
      dispatch(authChanged({
        status: 'anonymous',
        user: null,
        isLoggedIn: false,
        isLoading: false,
        error: null,
        errorCode: null,
        ...CLEARED_OTP,
      }));
      emitAuthEvent({ type: 'logout-completed' });
    }
  },

  resetSession: (): AuthThunk => (dispatch, _getState, runtime) => {
    runtime.otpSessionId = null;
    dispatch(authChanged({
      status: 'anonymous',
      user: null,
      isLoggedIn: false,
      isLoading: false,
      ...CLEARED_OTP,
    }));
  },

  clearError: (): AuthThunk => (dispatch) => {
    dispatch(authChanged({ error: null, errorCode: null }));
  },
};

type BoundAuthActions = {
  [K in keyof typeof authActions]: (...args: Parameters<(typeof authActions)[K]>) => ReturnType<ReturnType<(typeof authActions)[K]>>;
};

export function useAuthActions() {
  const dispatch = useDispatch.withTypes<AppStore['dispatch']>()();
  return useMemo(() => bindActionCreators<typeof authActions, BoundAuthActions>(authActions, dispatch), [dispatch]);
}
