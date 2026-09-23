/**
 * Google sign-in, browser half: start the redirect, then hand the code to our own API.
 *
 * The browser never sees the client secret. It obtains an authorization `code` from Google and
 * posts it to `POST /auth/oauth/google`, which redeems it server-side and answers with the same
 * `TokenResponse` as `/auth/login`. So this module owns exactly two things — building the
 * outbound URL, and carrying the PKCE verifier plus the CSRF `state` across the redirect.
 *
 * PKCE (RFC 7636) is what stops an intercepted `code` being redeemed by anyone else: the
 * verifier never leaves this browser, and Google will only redeem the code when the verifier
 * hashes to the challenge sent at the start. `state` is separate and solves a different
 * problem — it proves the callback we are handling belongs to a flow *we* started, rather than
 * a link someone sent the user.
 */

const AUTHORIZE_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

/**
 * `openid` is required or Google returns no `id_token` and the backend answers 503 saying so.
 * `email` is what the account is created or linked on. `profile` supplies the display name;
 * without it `full_name` falls back to the email's local part.
 */
const SCOPES = 'openid email profile';

/**
 * sessionStorage, not localStorage: this is single-use data for one redirect in one tab. A
 * second tab starting its own sign-in must not overwrite this tab's verifier, and nothing here
 * should outlive the tab.
 */
const PENDING_KEY = 'truzov.googleOAuthPending';

/** Path half of the redirect URI. Must match TRUZOV_GOOGLE_REDIRECT_URI on the backend. */
const CALLBACK_PATH = '/auth/google/callback';

interface PendingFlow {
  /** PKCE verifier. Sent to our API, never to Google directly from here. */
  verifier: string;
  /** Echoed by Google and compared on return. */
  state: string;
  /** Where the user was heading before we sent them to Google. */
  redirectTo: string;
}

/**
 * The redirect URI Google will send the code to.
 *
 * Derived from the live origin rather than hardcoded so a preview deployment works, but it must
 * be byte-identical to the backend's `TRUZOV_GOOGLE_REDIRECT_URI` *and* registered in the Google
 * console — the backend sends its own configured value to the token endpoint and deliberately
 * does not accept one from the request, so a mismatch fails the exchange with `invalid_grant`.
 */
export function googleRedirectUri(): string {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

function randomUrlSafeString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function s256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Builds the Google authorization URL and stashes what the callback will need.
 *
 * Returns the URL rather than navigating, so the caller decides when to leave the page.
 *
 * @param redirectTo where to land after a successful sign-in.
 */
export async function beginGoogleSignIn(redirectTo: string): Promise<string> {
  // 96 bytes -> 128 base64url characters, the maximum RFC 7636 allows and the maximum our API
  // accepts (`@Size(min = 43, max = 128)` on codeVerifier).
  const verifier = randomUrlSafeString(96);
  const state = randomUrlSafeString(16);

  const pending: PendingFlow = { verifier, state, redirectTo };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  const params = new URLSearchParams({
    client_id: requireClientId(),
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    code_challenge: await s256Challenge(verifier),
    code_challenge_method: 'S256',
    state,
    // Always show the chooser. Without it a user signed into one Google account is silently
    // reused, which is wrong on a shared machine and impossible to recover from in the UI.
    prompt: 'select_account',
  });

  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

/**
 * Consumes the stashed flow and verifies the returned `state`.
 *
 * Single-use: the entry is removed before validation, so a replayed or refreshed callback URL
 * cannot be processed twice. The authorization code is single-use at Google's end too, and a
 * second attempt would come back 401 — clearing here means the user sees an honest "start
 * again" instead of a confusing rejection.
 *
 * @throws Error when there is no pending flow, or the state does not match.
 */
export function completeGoogleSignIn(returnedState: string | null): PendingFlow {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);

  if (!raw) {
    throw new Error(
      'This sign-in link is no longer valid. Please start again from the sign-in page.'
    );
  }

  let pending: PendingFlow;
  try {
    pending = JSON.parse(raw) as PendingFlow;
  } catch {
    throw new Error('This sign-in could not be completed. Please start again.');
  }

  // The CSRF check. A callback whose state does not match one we generated was not started by
  // this browser, so the code in it is not ours to redeem.
  if (!returnedState || returnedState !== pending.state) {
    throw new Error('This sign-in could not be verified. Please start again.');
  }

  return pending;
}

/** Discards a pending flow without completing it — used when the user cancels at Google. */
export function abandonGoogleSignIn(): void {
  sessionStorage.removeItem(PENDING_KEY);
}

function requireClientId(): string {
  const clientId = googleClientId();

  if (!clientId) {
    // Unreachable through the UI: the button is not rendered without a client id. Kept so a
    // programmatic caller fails with the cause rather than sending Google an empty client_id.
    throw new Error(
      'Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable it.'
    );
  }

  return clientId;
}

/**
 * The configured client id, or null when Google sign-in is switched off.
 *
 * Optional on purpose, mirroring the backend: it treats absent credentials as a valid
 * configuration and answers 503, so the frontend hides the button rather than offering one that
 * cannot work. Read through `env` so the "throw on missing required variable" rule stays in one
 * place and this stays deliberately outside it.
 */
export function googleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}
