'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useBuyNow } from '@/hooks/api/useCart';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { isValidRedirect } from '@/lib/auth/redirect';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { AuthForm } from './AuthForm';

export function AuthModal() {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const { isOpen, mode, redirectTo, buyNow, closeAuthModal, setAuthModalMode } = useAuthModalStore();
  const clearError = useAuthStore((state) => state.clearError);
  const { checkout } = useBuyNow();

  useFocusTrap(modalRef, isOpen, closeAuthModal);

  useEffect(() => {
    if (isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

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
      className="fixed inset-0 z-[80] grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div
        ref={modalRef}
        className="relative max-h-[calc(100vh-48px)] w-full max-w-md overflow-y-auto rounded-xl border border-outline-variant bg-white p-6 shadow-md sm:p-8"
        tabIndex={-1}
      >
        <button
          aria-label="Close account dialog"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-secondary transition hover:bg-surface-container"
          type="button"
          onClick={closeAuthModal}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="mb-6 flex justify-center">
          <Image alt="truzov" className="h-9 w-auto" height={40} src="/truzov-logo.png" width={160} />
        </div>

        <div className="mb-6 text-center">
          <h2 id="auth-modal-title" className="font-body text-2xl font-semibold leading-tight text-primary">
            {mode === 'login' ? 'Login with OTP' : 'Create your account'}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-secondary">
            {mode === 'login'
              ? 'Sign in to continue your verified checkout'
              : 'Start shopping verified health products faster'}
          </p>
        </div>

        <AuthForm
          mode={mode}
          redirectTo={redirectTo}
          variant="modal"
          onModeChange={setAuthModalMode}
          onSuccess={handleSuccess}
        />

        <p className="mt-6 text-center text-xs leading-relaxed text-secondary/70">
          By continuing, you agree to truzov&apos;s{' '}
          <Link className="underline" href="/trust/how-it-works">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link className="underline" href="/trust/lab-reports">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
