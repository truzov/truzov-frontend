'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isValidRedirect } from '@/lib/auth/redirect';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';

/**
 * Auth is a popup, not a page (spec §3).
 *
 * These routes exist only so links, bookmarks, and the guard / session-expiry redirects that
 * still point at `/login` and `/signup` keep working: on arrival they open the modal in the
 * right mode and drop the visitor on the home page behind it, carrying any `?redirect=` through
 * so a successful login lands them where they meant to go. Anything that already has the modal
 * (a header button) opens it directly and never routes here.
 */
export function AuthModalRedirect({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    // Wait for session restore to settle, so an already-signed-in visitor is never shown a
    // login modal for a frame.
    if (status === 'idle' || status === 'restoring') {
      return;
    }

    const raw =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null;
    const redirectTo = isValidRedirect(raw) ? raw ?? undefined : undefined;

    if (status === 'authenticated') {
      router.replace(redirectTo ?? '/');
      return;
    }

    openAuthModal({ mode, redirectTo });
    router.replace('/');
  }, [status, mode, openAuthModal, router]);

  return null;
}
