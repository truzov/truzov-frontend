'use client';

import { create } from 'zustand';
import {
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
import { useGuestCartStore } from '@/lib/cart/guest-cart.store';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { useUiStore, type ToastMessage } from '@/store/ui.store';
import type { OtpChannel, SignupResponse, UpdateProfileRequest, UserProfileDto } from '@/types/api';

/**
 * Authentication state, backed entirely by the real API.
 *
 * What was removed and why:
 *  - `mockAPI` (fake signup/sendOTP/verifyOTP) — replaced by the documented endpoints.
 *  - `createMockUser` — the user now comes from `TokenResponse.user` / `GET /auth/me`.
 *  - `loginAs(role)` — it let the CLIENT pick its own role and granted a session with no
 *    credentials. The server is the only thing that may decide a role; it arrives in the token
 *    response.
 *  - `persist` middleware — see the note on `status` below.
 */

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

  /** Pending OTP session, set by signup or otp/send and consumed by otp/verify. */
  otpSessionId: string | null;
  otpChannel: OtpChannel | null;
  /** Shown back to the user ("code sent to ..."), and reused for resend. */
  pendingIdentifier: string | null;
  /** Server-provided lifetime; drives the resend cooldown instead of a hardcoded 30s. */
  otpExpiresInSeconds: number | null;
  /**
   * A CONSUMED session whose code was verified against an identifier that has no
   * account (404 ACCOUNT_NOT_FOUND). It vouches for that identifier at signup for
   * 15 minutes server-side, so the signup form that follows is born verified with
   * no second code. Cleared on signup, login, or logout.
   */
  verifiedOtpSessionId: string | null;

  restoreSession: () => Promise<void>;
  signup: (input: {
    fullName: string;
    phone: string;
    password: string;
    email?: string;
    otpChannel?: OtpChannel;
  }) => Promise<SignupResponse>;
  sendOtp: (identifier: string, purpose?: 'login' | 'verify') => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  loginWithPassword: (identifier: string, password: string) => Promise<void>;
  /** Second half of the Google redirect: exchanges the returned code for a session. */
  loginWithGoogle: (code: string, codeVerifier: string) => Promise<void>;
  updateProfile: (updates: UpdateProfileRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  /** Local-only teardown, called by AuthEventBridge when the fetch layer reports a dead session. */
  resetSession: () => void;
  clearError: () => void;
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
  otpSessionId: null,
  otpChannel: null,
  pendingIdentifier: null,
  otpExpiresInSeconds: null,
  verifiedOtpSessionId: null,
} as const;

/**
 * Deliberately NOT wrapped in `persist`.
 *
 * Persisting the profile would buy a slightly faster first paint of the user's name, at the
 * cost of rendering a possibly-stale identity (or logged-in chrome for a session the server has
 * since revoked) before the first request confirms anything. The access token is in memory and
 * the refresh token is in its own storage key, so a reload already has to make one round trip;
 * showing "Account" for that moment is the honest option.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'idle',
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
  errorCode: null,
  ...CLEARED_OTP,

  restoreSession: async () => {
    // Nothing to restore: no refresh token means no session to recover, so skip the round trip.
    if (!canRestoreSession() && !get().isLoggedIn) {
      if (!getRefreshToken()) {
        set({ status: 'anonymous', user: null, isLoggedIn: false });
        return;
      }
    }

    // Guard against a second call while one is in flight (React strict mode double-invokes
    // effects in development, and two /auth/me calls would race).
    if (get().status === 'restoring') {
      return;
    }

    set({ status: 'restoring' });

    try {
      // Sent with no access token in hand: the server answers 401, and the client's
      // refresh-then-retry-once path exchanges the stored refresh token for a live pair. That
      // is the whole session-restore mechanism — there is no separate "restore" endpoint.
      const user = await getCurrentUser();
      set({ status: 'authenticated', user, isLoggedIn: true });
    } catch {
      // Refresh token missing, expired, or already rotated away. Not an error worth showing:
      // from the user's point of view they are simply signed out.
      clearSession('unauthorized', { silent: true });
      set({ status: 'anonymous', user: null, isLoggedIn: false });
    }
  },

  signup: async ({ fullName, phone, password, email, otpChannel = 'phone' }) => {
    set({ isLoading: true, error: null, errorCode: null });

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
      set({
        isLoading: false,
        otpSessionId: response.otpSessionId,
        otpChannel: response.otpChannel,
        pendingIdentifier: otpChannel === 'email' ? (email?.trim() ?? phone) : phone,
        otpExpiresInSeconds: response.expiresInSeconds,
        verifiedOtpSessionId: null,
      });
      return response;
    } catch (error) {
      set(toErrorState(error));
      throw error;
    }
  },

  sendOtp: async (identifier, purpose = 'login') => {
    set({ isLoading: true, error: null, errorCode: null });

    // Phone numbers are entered with spaces, dashes and brackets; email is not. Only strip
    // non-digits when the value is clearly not an email, or "a@b.com" would become "".
    const trimmed = identifier.trim();
    const normalised = trimmed.includes('@') ? trimmed : trimmed.replace(/[^\d+]/g, '');

    try {
      const response = await sendOtpRequest({ identifier: normalised, purpose });
      set({
        isLoading: false,
        otpSessionId: response.otpSessionId,
        otpChannel: response.channel,
        pendingIdentifier: normalised,
        otpExpiresInSeconds: response.expiresInSeconds,
      });
    } catch (error) {
      set(toErrorState(error));
      throw error;
    }
  },

  verifyOtp: async (code) => {
    const { otpSessionId } = get();

    if (!otpSessionId) {
      const error = new ApiError({
        code: 'OTP_SESSION_MISSING',
        message: 'That verification session has gone. Please request a new code.',
        status: 0,
      });
      set(toErrorState(error));
      throw error;
    }

    set({ isLoading: true, error: null, errorCode: null });

    try {
      const tokens = await verifyOtpRequest({ otpSessionId, code });
      setSession(tokens);
      set({
        status: 'authenticated',
        user: tokens.user,
        isLoggedIn: true,
        isLoading: false,
        ...CLEARED_OTP,
      });
      useUiStore.getState().addToast({ type: 'success', title: 'Login successful' });
    } catch (error) {
      useUiStore.getState().addToast(loginFailureToast(error));

      // OTP_EXPIRED (410) means the session is spent, so drop it — leaving it in place would
      // let the user keep submitting codes against a session that can never succeed. A wrong
      // code (400 OTP_INVALID) keeps the session so they can simply try again.
      if (isApiError(error) && error.code === 'OTP_EXPIRED') {
        set({ ...toErrorState(error), otpSessionId: null });
      } else if (isApiError(error) && error.code === 'ACCOUNT_NOT_FOUND') {
        // The code was CORRECT but the identifier has no account. The consumed session
        // becomes a signup voucher: keep it and the identifier so the signup form the
        // client switches to is pre-filled and born verified. The session itself can no
        // longer verify anything, so otpSessionId goes.
        set({
          ...toErrorState(error),
          otpSessionId: null,
          verifiedOtpSessionId: otpSessionId,
        });
      } else {
        set(toErrorState(error));
      }
      throw error;
    }
  },

  loginWithPassword: async (identifier, password) => {
    set({ isLoading: true, error: null, errorCode: null });

    try {
      const tokens = await loginRequest({ identifier: identifier.trim(), password });
      setSession(tokens);
      set({
        status: 'authenticated',
        // Role comes from the server. The client never decides it.
        user: tokens.user,
        isLoggedIn: true,
        isLoading: false,
        ...CLEARED_OTP,
      });
      useUiStore.getState().addToast({ type: 'success', title: 'Login successful' });
    } catch (error) {
      useUiStore.getState().addToast(loginFailureToast(error));
      set(toErrorState(error));
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
  loginWithGoogle: async (code, codeVerifier) => {
    set({ isLoading: true, error: null, errorCode: null });

    try {
      const tokens = await loginWithGoogleRequest({ code, codeVerifier });
      setSession(tokens);
      set({
        status: 'authenticated',
        user: tokens.user,
        isLoggedIn: true,
        isLoading: false,
        ...CLEARED_OTP,
      });
      useUiStore.getState().addToast({ type: 'success', title: 'Login successful' });
    } catch (error) {
      useUiStore.getState().addToast(loginFailureToast(error));
      set(toErrorState(error));
      throw error;
    }
  },

  updateProfile: async (updates) => {    set({ isLoading: true, error: null, errorCode: null });

    try {
      const user = await updateProfileRequest(updates);
      // Replace wholesale rather than merging: changing email or phone clears that channel's
      // verification flag server-side, and a merge would keep the stale `emailVerified: true`.
      set({ user, isLoading: false });
    } catch (error) {
      set(toErrorState(error));
      throw error;
    }
  },

  refreshUser: async () => {
    try {
      const user = await getCurrentUser();
      set({ user, status: 'authenticated', isLoggedIn: true });
    } catch {
      // Background revalidation. A failure here is handled by the client's own 401 path; there
      // is nothing useful to show the user for a refresh they did not ask for.
    }
  },

  logout: async () => {
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
      // The rest of the user-visible state that survives a token clear on its own.
      useGuestCartStore.getState().clear();
      useCheckoutStore.getState().resetCheckout();
      useAuthModalStore.getState().closeAuthModal(); // drops any retained Buy_Now_Intent (R5.9)
      set({
        status: 'anonymous',
        user: null,
        isLoggedIn: false,
        isLoading: false,
        error: null,
        errorCode: null,
        ...CLEARED_OTP,
      });
      useUiStore.getState().addToast({ type: 'success', title: 'Logged out' });
    }
  },

  resetSession: () => {
    set({
      status: 'anonymous',
      user: null,
      isLoggedIn: false,
      isLoading: false,
      ...CLEARED_OTP,
    });
  },

  clearError: () => set({ error: null, errorCode: null }),
}));
