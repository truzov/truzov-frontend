'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { onAuthEvent } from '@/lib/api/auth-events';
import { useAuthStore } from '@/store/auth.store';

/**
 * The auth runtime: restores the session on load, and turns the fetch layer's auth events into
 * navigation and cache resets.
 *
 * The event half exists because the API client cannot navigate. It is a plain module with no
 * access to `useRouter`, and wiring Next's router into it would couple the network layer to the
 * React tree. So the client reports "session died" / "OTP required" and this single mounted
 * listener decides where the user goes — one place to reason about, rather than a redirect
 * scattered through every screen's error handler.
 *
 * Renders nothing; it is mounted once from app/providers.tsx.
 */
export function AuthEventBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const reset = useAuthStore((state) => state.resetSession);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  // Runs once per page load. The access token is intentionally memory-only, so after any reload
  // it is gone and the stored refresh token has to be exchanged for a live pair before
  // authenticated UI can render. Guards wait on `status !== 'idle' | 'restoring'` rather than
  // assuming "no token means logged out", which is what previously bounced valid sessions to
  // /login on refresh.
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    return onAuthEvent((event) => {
      if (event.type === 'session-cleared') {
        reset();
        // Every cached query was fetched as the previous user. Clearing rather than
        // invalidating matters here: invalidation would refetch immediately with no token and
        // produce a burst of 401s, and any cached personal data would stay readable in the
        // meantime.
        queryClient.clear();

        // An explicit logout navigates on its own; redirecting here as well would fight it.
        if (event.reason === 'logout') {
          return;
        }

        // Carry the current location so the user lands back where they were after signing in.
        // Auth pages are skipped: bouncing /login to /login?redirect=/login is a loop.
        if (isAuthRoute(pathname)) {
          return;
        }

        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      if (event.type === 'otp-required') {
        // 403 PHONE_NOT_VERIFIED / ACCOUNT_NOT_VERIFIED. The user is signed in; they just have
        // an unverified channel, so this is verification rather than a fresh login.
        if (pathname === '/verify-otp') {
          return;
        }

        router.push(`/verify-otp?redirect=${encodeURIComponent(pathname)}`);
      }
    });
  }, [pathname, queryClient, reset, router]);

  return null;
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/register' ||
    pathname === '/verify-otp'
  );
}
