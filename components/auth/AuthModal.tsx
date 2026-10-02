'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useBuyNow } from '@/hooks/api/useCart';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { isValidRedirect } from '@/lib/auth/redirect';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { AuthForm } from './AuthForm';
import { Logo } from '@/components/layout/Logo';

export function AuthModal() {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const { isOpen, mode, redirectTo, buyNow, closeAuthModal, setAuthModalMode } =
    useAuthModalStore();
  const clearError = useAuthStore((state) => state.clearError);
  const { checkout } = useBuyNow();

  useFocusTrap(modalRef, isOpen, closeAuthModal);

  useEffect(() => {
    if (isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSuccess = () => {
    const nextPath = redirectTo;
    const intent = buyNow;
    closeAuthModal();

    if (intent) {
      // Resume the Buy Now that opened this modal instead of the redirect target.
      // Google sign-in is a full-page redirect, so an intent from that path cannot survive to
      // reach here — accepted per Requirement 2.11 (memory-only, never persisted), not a bug.
      void checkout(intent);
      return;
    }

    if (nextPath) {
      // `openAuthModal` is callable from anywhere, so `redirectTo` is untrusted input:
      // an off-origin or non-HTTP target is discarded for the default landing route.
      router.push(isValidRedirect(nextPath) ? nextPath : '/');
    }
  };

  return (
    <div
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-description"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/55 px-3 py-4 backdrop-blur-sm"
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeAuthModal();
      }}
    >
      <div
        ref={modalRef}
        className="auth-surface relative flex max-h-[calc(100dvh-32px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#dce6d8] bg-[#fdfbf7] shadow-2xl"
        tabIndex={-1}
      >
        <button
          aria-label="Close account dialog"
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-[#04342c] transition hover:bg-[#eaf3de] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          type="button"
          onClick={closeAuthModal}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="flex shrink-0 justify-center border-b border-[#dce6d8] px-14 py-4">
          <Logo className="w-[128px]" onClick={closeAuthModal} />
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7">
          <div className="mb-5 text-center">
            <h2
              id="auth-modal-title"
              className="text-[29px] font-medium leading-tight text-[#04342c]"
            >
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p id="auth-modal-description" className="mt-2 text-sm leading-relaxed text-secondary">
              {mode === 'login'
                ? 'Sign in to manage your orders, wishlist and deliveries.'
                : 'Save your wishlist and keep track of your orders.'}
            </p>
          </div>

          <AuthForm
            mode={mode}
            redirectTo={redirectTo}
            variant="modal"
            onModeChange={setAuthModalMode}
            onSuccess={handleSuccess}
          />

          <p className="mt-5 text-center text-xs leading-relaxed text-secondary">
            By continuing, you agree to truzov&apos;s{' '}
            <Link className="underline" href="/policies/terms-of-service" onClick={closeAuthModal}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link className="underline" href="/policies/privacy-policy" onClick={closeAuthModal}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
