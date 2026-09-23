'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Client-side route guard.
 *
 * The important change from the previous version: it now waits for the session-restore round
 * trip to finish before deciding. Before, it redirected whenever `isLoggedIn` was false while
 * `isLoading` started as `false` — so on a hard refresh, the very first render of a perfectly
 * valid session looked like "not loading, not logged in" and bounced the user to /login. That
 * was invisible with a fake, synchronously-persisted login flag and becomes a guaranteed bug
 * with real tokens, because the access token is memory-only and always absent after a reload.
 *
 * `isLoading` here means "we do not know yet" — callers should render a skeleton for it, not
 * treat it as logged out.
 *
 * Pass `redirectTo={false}` to disable the redirect entirely (e.g. a route that renders its own
 * guest-facing view instead of bouncing away). `isLoggedIn`/`isLoading` still resolve normally.
 */
export function useProtectedRoute(redirectTo: string | false = '/login') {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);

  // 'idle' counts as undecided too: the restore effect in AuthEventBridge may not have run for
  // this render yet, and redirecting in that window is the original bug.
  const isResolving = status === 'idle' || status === 'restoring';
  const isLoggedIn = status === 'authenticated';

  useEffect(() => {
    if (isResolving || isLoggedIn || redirectTo === false) {
      return;
    }

    const nextUrl =
      redirectTo === '/login'
        ? `${redirectTo}?redirect=${encodeURIComponent(pathname)}`
        : redirectTo;

    router.push(nextUrl);
  }, [isResolving, isLoggedIn, pathname, redirectTo, router]);

  return { isLoggedIn, isLoading: isResolving };
}
