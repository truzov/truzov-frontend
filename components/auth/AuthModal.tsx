'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { AuthForm } from './AuthForm';

export function AuthModal() {
  const router = useRouter();
  const { isOpen, mode, redirectTo, closeAuthModal, setAuthModalMode } = useAuthModalStore();
  const clearError = useAuthStore((state) => state.clearError);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAuthModal();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeAuthModal, isOpen]);

  useEffect(() => {
    if (isOpen) {
      clearError();
    }
  }, [clearError, isOpen, mode]);

  if (!isOpen) {
    return null;
  }

  const handleSuccess = () => {
    const nextPath = redirectTo;
    closeAuthModal();

    if (nextPath) {
      router.push(nextPath);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="relative max-h-[calc(100vh-48px)] w-full max-w-md overflow-y-auto rounded-xl border border-outline-variant bg-white p-6 shadow-md sm:p-8">
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
          <h2 className="font-body text-2xl font-semibold leading-tight text-primary">
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
