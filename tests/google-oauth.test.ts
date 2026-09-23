import { describe, expect, it, beforeEach } from 'vitest';
import {
  abandonGoogleSignIn,
  beginGoogleSignIn,
  completeGoogleSignIn,
  googleRedirectUri,
} from '@/lib/auth/google-oauth';

/**
 * The Google redirect's security-relevant halves: PKCE and the CSRF `state`.
 *
 * These are worth pinning because both fail silently if broken. A verifier that leaked into the
 * outbound URL, or a state check that accepted anything, would still produce a working sign-in
 * on the happy path — the flow only stops being safe, not stops working.
 */
describe('google-oauth', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('builds an authorize URL with S256 PKCE and no secret', async () => {
    const url = new URL(await beginGoogleSignIn('/account'));
    const params = url.searchParams;

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('code_challenge_method')).toBe('S256');
    // Base64url of a SHA-256 digest is always 43 characters unpadded.
    expect(params.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(params.get('scope')).toContain('openid');
    expect(params.get('redirect_uri')).toBe(googleRedirectUri());
    // The browser half must never carry a client secret.
    expect(url.search).not.toContain('client_secret');
  });

  it('sends the challenge, never the verifier', async () => {
    const url = await beginGoogleSignIn('/');
    const { verifier } = JSON.parse(sessionStorage.getItem('truzov.googleOAuthPending')!);

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    // The whole point of PKCE: only the hash goes to Google.
    expect(url).not.toContain(verifier);
  });

  it('returns the verifier and redirect target when the state matches', async () => {
    await beginGoogleSignIn('/checkout');
    const { state } = JSON.parse(sessionStorage.getItem('truzov.googleOAuthPending')!);

    const pending = completeGoogleSignIn(state);

    expect(pending.redirectTo).toBe('/checkout');
    expect(pending.verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  it('rejects a callback whose state does not match', async () => {
    await beginGoogleSignIn('/');

    expect(() => completeGoogleSignIn('not-the-state-we-generated')).toThrow(/could not be verified/i);
  });

  it('rejects a callback with no state at all', async () => {
    await beginGoogleSignIn('/');

    expect(() => completeGoogleSignIn(null)).toThrow(/could not be verified/i);
  });

  it('is single-use, so a replayed callback cannot be processed twice', async () => {
    await beginGoogleSignIn('/');
    const { state } = JSON.parse(sessionStorage.getItem('truzov.googleOAuthPending')!);

    expect(completeGoogleSignIn(state).redirectTo).toBe('/');
    // The authorization code is single-use at Google's end too, so a second attempt could only
    // ever fail — refusing here means the user is told to start again rather than being shown a
    // confusing rejection from the API.
    expect(() => completeGoogleSignIn(state)).toThrow(/no longer valid/i);
  });

  it('consumes the pending flow even when the state is wrong', async () => {
    await beginGoogleSignIn('/');

    expect(() => completeGoogleSignIn('wrong')).toThrow();
    // Cleared regardless of outcome: leaving it would let an attacker retry states against a
    // live verifier.
    expect(sessionStorage.getItem('truzov.googleOAuthPending')).toBeNull();
  });

  it('gives each attempt a fresh verifier and state', async () => {
    await beginGoogleSignIn('/');
    const first = JSON.parse(sessionStorage.getItem('truzov.googleOAuthPending')!);
    await beginGoogleSignIn('/');
    const second = JSON.parse(sessionStorage.getItem('truzov.googleOAuthPending')!);

    expect(second.verifier).not.toBe(first.verifier);
    expect(second.state).not.toBe(first.state);
  });

  it('abandonGoogleSignIn drops a pending flow', async () => {
    await beginGoogleSignIn('/');

    abandonGoogleSignIn();

    expect(sessionStorage.getItem('truzov.googleOAuthPending')).toBeNull();
  });
});
