/**
 * A tiny pub/sub for the two auth situations the fetch layer detects but cannot act on.
 *
 * Why this indirection exists: both are *routing* decisions ("go to /verify-otp", "go to
 * /login"), and the API client is a plain module — it has no access to `useRouter`, and
 * importing Next's router into it would tie the network layer to the React tree and break
 * server-side use. So the client reports what happened, and one mounted component (see
 * components/auth/AuthEventBridge.tsx) does the navigating.
 *
 * It lives in its own file rather than inside the token store so that both the client and the
 * token store can emit without importing each other, which would be a cycle.
 */

export type AuthEvent =
  /**
   * The session is gone and cannot be recovered: refresh failed, or the refresh token was
   * rejected. Consumers should clear user state and send the user to sign in.
   */
  | { type: 'session-cleared'; reason: 'refresh-failed' | 'logout' | 'unauthorized' }
  /**
   * A 403 PHONE_NOT_VERIFIED / ACCOUNT_NOT_VERIFIED. The user is authenticated but must
   * complete OTP verification before the call will succeed.
   */
  | { type: 'otp-required' };

type Listener = (event: AuthEvent) => void;

const listeners = new Set<Listener>();

export function onAuthEvent(listener: Listener): () => void {
  listeners.add(listener);
  // Returning the unsubscriber keeps this usable directly from a useEffect cleanup.
  return () => listeners.delete(listener);
}

export function emitAuthEvent(event: AuthEvent): void {
  // Snapshot before iterating: a listener that unsubscribes itself while handling an event
  // would otherwise mutate the Set mid-iteration.
  for (const listener of Array.from(listeners)) {
    listener(event);
  }
}
