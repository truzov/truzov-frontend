'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { onAuthEvent } from '@/lib/api/auth-events';
import { clearGuestCart } from '@/lib/cart/guest-cart.store';
import { useAuthModalActions } from '@/store/auth-modal.store';
import { useAuthActions } from '@/store/auth.store';
import { resetCheckout } from '@/store/checkout.store';
import { useOtpModalActions } from '@/store/otp-modal.store';
import { useAppDispatch } from '@/store/redux';
import { useToastActions } from '@/store/ui.store';

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
  const dispatch = useAppDispatch();
  const { resetSession: reset, restoreSession } = useAuthActions();
  const { openOtpModal } = useOtpModalActions();
  const { closeAuthModal } = useAuthModalActions();
  const { addToast } = useToastActions();

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
        // an unverified phone, so this opens the verification popup in place instead of routing
        // to a full page. `pathname` is carried so a successful verify returns them here.
        openOtpModal({ redirectTo: pathname });
      }
      if (event.type === 'toast') {
        addToast(event.toast);
      }
      if (event.type === 'logout-completed') {
        dispatch(clearGuestCart());
        dispatch(resetCheckout());
        closeAuthModal(); // drops any retained Buy Now intent
        addToast({ type: 'success', title: 'Logged out' });
      }
    });
  }, [addToast, closeAuthModal, dispatch, openOtpModal, pathname, queryClient, reset, router]);

  return null;
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/register'
  );
}
