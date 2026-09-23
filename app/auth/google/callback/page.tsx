'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { abandonGoogleSignIn, completeGoogleSignIn } from '@/lib/auth/google-oauth';
import { errorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';

/**
 * Where Google sends the browser back to. Registered in the Google console and configured
 * server-side as TRUZOV_GOOGLE_REDIRECT_URI — the path is part of a contract, so renaming this
 * route breaks the exchange with `invalid_grant` until both are changed too.
 *
 * It renders nothing useful on purpose: its whole job is to trade the `code` in the URL for a
 * session and get the user off this page. Any URL here contains a single-use authorization code,
 * so it must never be bookmarked, shared, or left in history as something worth returning to —
 * hence `router.replace` on every exit rather than `push`.
 */
export default function GoogleCallbackPage() {
  return (
    // useSearchParams needs a Suspense boundary in the App Router; without one this page opts
    // the whole route into client-side rendering and `next build` fails the prerender.
    <Suspense fallback={<CallbackShell message="Completing sign-in..." />}>
      <GoogleCallback />
    </Suspense>
  );
}

function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [error, setError] = useState<string | null>(null);

  // React strict mode double-invokes effects in development, and the code is single-use: the
  // second call would be rejected 401 and overwrite a session the first call just created.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const code = searchParams.get('code');
    const googleError = searchParams.get('error');

    // The user pressed "Cancel" at Google, or Google refused the request outright. Not a failure
    // worth an error screen — send them back to sign in.
    if (googleError) {
      abandonGoogleSignIn();
      router.replace(googleError === 'access_denied' ? '/login' : '/login?oauth=failed');
      return;
    }

    if (!code) {
      setError('This sign-in link is incomplete. Please start again from the sign-in page.');
      return;
    }

    let pending;
    try {
      // Validates `state` and consumes the stored verifier. Throws if this callback does not
      // belong to a flow started in this tab.
      pending = completeGoogleSignIn(searchParams.get('state'));
    } catch (stateError) {
      // Its own message, not errorMessage(): these are locally-thrown Errors with copy written
      // for the user, and errorMessage only unwraps ApiError and would flatten them to
      // "Something went wrong."
      setError(
        stateError instanceof Error
          ? stateError.message
          : 'This sign-in could not be completed. Please start again.'
      );
      return;
    }

    loginWithGoogle(code, pending.verifier)
      .then(() => router.replace(pending.redirectTo))
      // The store already put the message in `error`; this catch exists so the rejection is
      // handled rather than surfacing as an unhandled promise rejection in the console.
      .catch((exchangeError: unknown) => setError(errorMessage(exchangeError)));
  }, [loginWithGoogle, router, searchParams]);

  if (error) {
    return (
      <AuthLayout
        subtitle="We could not complete your Google sign-in."
        title="Sign-in failed"
      >
        <div className="grid gap-md">
          <p className="rounded-lg bg-error-container p-sm text-caption text-error">{error}</p>
          <button
            className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-h6 font-bold font-body text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md active:scale-[0.98]"
            type="button"
            onClick={() => router.replace('/login')}
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return <CallbackShell message="Completing sign-in..." />;
}

function CallbackShell({ message }: { message: string }) {
  return (
    <AuthLayout subtitle="This will only take a moment." title="Signing you in">
      <div className="flex items-center justify-center gap-sm py-xl text-body-md font-body text-on-surface-variant">
        <Loader2 className="h-5 w-5 animate-spin" />
        {message}
      </div>
    </AuthLayout>
  );
}
