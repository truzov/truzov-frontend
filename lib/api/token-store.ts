import type { TokenResponse } from '@/types/api';
import { emitAuthEvent } from './auth-events';

/**
 * Owns the auth tokens. Nothing else may read or write them.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * SECURITY MODEL — accepted risk, deliberately documented (plan §8.5, §T1)
 * ────────────────────────────────────────────────────────────────────────────────
 * Access token: IN MEMORY ONLY. It lives for at most 15 minutes (the backend caps
 * `access-ttl-seconds` at 900), so the cost of losing it on reload is one refresh call, and
 * keeping it out of storage means an XSS payload cannot obtain it by dumping localStorage.
 *
 * Refresh token: localStorage. This is the part that is NOT ideal, and it is a conscious
 * trade rather than an oversight. The backend exposes no httpOnly-cookie refresh flow today
 * (and runs `cors.allow-credentials: false`, so a cookie flow would need a backend change on
 * both counts), while the session must survive a page reload. localStorage is readable by any
 * successful XSS, so this trades CSRF exposure for XSS-driven token theft. Two things are
 * required alongside it: a Content-Security-Policy plus output sanitisation, and backend
 * ticket §T1 to add httpOnly refresh cookies before wider production rollout. This is the
 * correct answer for now, not the permanent one.
 *
 * Consequence for anyone editing this file: never log a token value, never put one in a URL,
 * never add it to an error message, and never persist the access token.
 */

/**
 * Dedicated key. The token deliberately does NOT live in the Zustand `truzov-auth` blob any
 * more — the old client JSON-parsed that persisted store to fish the token out, which coupled
 * the network layer to a UI store's serialisation format.
 */
const REFRESH_TOKEN_KEY = 'truzov.refreshToken';

/** Not persisted, by design. See the security model above. */
let accessToken: string | null = null;

/** SSR-safe: this module is imported by code that also runs on the server. */
function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    // Storage can throw rather than return null: Safari private mode and some embedded
    // webviews reject access outright. Treat that as "no session" instead of crashing the app.
    return null;
  }
}

/** Persist a fresh token pair after signup, login, OTP verify, or refresh. */
export function setSession(tokens: Pick<TokenResponse, 'accessToken' | 'refreshToken'>): void {
  accessToken = tokens.accessToken;

  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    // Quota or a disabled store. The in-memory access token still works for this tab, so the
    // user is not blocked — they will simply have to sign in again after a reload.
  }
}

/**
 * Drop all tokens.
 *
 * `silent` exists for the logout path: there the caller is already navigating, and emitting
 * `session-cleared` would race with that. Every involuntary clear (refresh failure) must emit,
 * because that is the only signal the UI gets that the session died mid-flight.
 */
export function clearSession(
  reason: 'refresh-failed' | 'logout' | 'unauthorized',
  options?: { silent?: boolean }
): void {
  accessToken = null;

  if (canUseStorage()) {
    try {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Nothing useful to do; the in-memory token is already gone, which is what gates
      // authenticated requests.
    }
  }

  if (!options?.silent) {
    emitAuthEvent({ type: 'session-cleared', reason });
  }
}

/**
 * True when a session might be recoverable — i.e. we have a refresh token but no access
 * token, the normal state immediately after a page reload. Used by the boot sequence to
 * decide whether to attempt a refresh before rendering authenticated UI.
 */
export function canRestoreSession(): boolean {
  return accessToken === null && getRefreshToken() !== null;
}
