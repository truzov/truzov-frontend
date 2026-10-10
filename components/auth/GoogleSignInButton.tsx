'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { beginGoogleSignIn, googleClientId } from '@/lib/auth/google-oauth';

interface GoogleSignInButtonProps {
  /** Where to land after a successful sign-in. Carried across the redirect. */
  redirectTo?: string;
}

/**
 * Starts the Google redirect. Renders nothing when Google sign-in is not configured.
 *
 * Hiding rather than disabling: the backend treats absent credentials as a valid configuration
 * and answers 503, so an environment without a client id has no Google sign-in to offer — a
 * greyed-out button would suggest the user is doing something wrong.
 *
 * The button stays in a loading state after the URL is built, because the tab is about to
 * navigate away. Resetting it would flash "Continue with Google" again during the hand-off.
 */
export function GoogleSignInButton({ redirectTo = '/' }: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!googleClientId()) {
    return null;
  }

  async function handleClick() {
    setError(null);
    setIsRedirecting(true);

    try {
      window.location.assign(await beginGoogleSignIn(redirectTo));
    } catch {
      // Building the URL needs crypto.subtle, which browsers only expose over HTTPS or on
      // localhost. On a plain-HTTP staging host it is undefined, and failing here with a clear
      // message beats navigating to Google with no challenge and being rejected there.
      setError('Google sign-in is unavailable in this browser. Please use email or phone.');
      setIsRedirecting(false);
    }
  }

  return (
    <div className="grid gap-sm">
      <div className="flex items-center gap-sm">
        <span className="h-px flex-1 bg-outline-variant" />
        <span className="text-caption font-body text-on-surface-variant">or</span>
        <span className="h-px flex-1 bg-outline-variant" />
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-error-container p-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <Button
        className="w-full bg-white"
        variant="outline"
        size="lg"
        disabled={isRedirecting}
        type="button"
        onClick={handleClick}
      >
        {isRedirecting ? (
          <>
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            <GoogleMark />
            Continue with Google
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Google's four-colour mark, inline.
 *
 * Inline rather than an <img> or an icon-library import: Google's brand guidelines require these
 * exact colours, lucide-react has no Google mark, and a remote asset would add a render-blocking
 * request plus a `next.config.ts` remotePatterns entry for one 20px glyph.
 */
function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
