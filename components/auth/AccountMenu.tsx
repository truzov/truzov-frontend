'use client';

import {
  Heart,
  IdCard,
  Loader2,
  LogOut,
  MapPin,
  ReceiptText,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils/cn';

type AuthStep = 'phone' | 'otp';

const menuItems = [
  { label: 'My Account', href: '/account', icon: UserRound },
  { label: 'Your Orders', href: '/account/orders', icon: ReceiptText },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
  { label: 'Settings', href: '/account', icon: Settings },
];

export function AccountMenu({ className }: { className?: string }) {
  const {
    isLoggedIn,
    user,
    sendOTP,
    verifyOTP,
    loginAs,
    logout,
    isLoading,
    error,
    clearError,
  } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!authOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAuthOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [authOpen]);

  const openAuth = () => {
    setAuthStep('phone');
    setPhone('');
    setFormError(null);
    clearError();
    setAuthOpen(true);
    setMenuOpen(false);
  };

  const handleAccountClick = () => {
    if (isLoggedIn) {
      setMenuOpen((open) => !open);
      return;
    }

    openAuth();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const nextPhone = String(formData.get('phone') ?? phone).trim();
    const otp = String(formData.get('otp') ?? '').trim();

    if (authStep === 'phone') {
      const normalizedPhone = nextPhone.replace(/\D/g, '');

      if (normalizedPhone.length < 10) {
        setFormError('Enter a valid 10 digit phone number.');
        return;
      }

      try {
        await sendOTP(normalizedPhone);
        setPhone(normalizedPhone);
        setAuthStep('otp');
      } catch {
        setFormError(null);
      }

      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setFormError('Enter the 6 digit OTP.');
      return;
    }

    try {
      await verifyOTP(otp);
      setAuthOpen(false);
      setMenuOpen(true);
    } catch {
      setFormError(null);
    }
  };

  const completeSocialLogin = (role: 'customer' | 'vendor') => {
    loginAs(role);
    setAuthOpen(false);
    setMenuOpen(true);
  };

  const displayName = user?.name || 'Darrell Steward';
  const displayEmail = user?.email || 'darrell.s@example.com';

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        aria-expanded={isLoggedIn ? menuOpen : authOpen}
        aria-label="Account"
        className="grid h-10 w-10 place-items-center rounded-full text-on-surface transition hover:bg-surface-container-low hover:text-primary"
        type="button"
        onClick={handleAccountClick}
      >
        <UserRound aria-hidden="true" className="h-7 w-7" />
      </button>

      {menuOpen && isLoggedIn ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[min(348px,calc(100vw-32px))] rounded-lg border border-outline-variant bg-white shadow-md">
          <span className="absolute -top-2 right-5 h-4 w-4 rotate-45 border-l border-t border-outline-variant bg-white" />
          <div className="px-5 py-5">
            <p className="text-xl font-bold leading-tight text-on-surface">{displayName}</p>
            <p className="mt-2 text-base text-on-surface-variant">{displayEmail}</p>
          </div>
          <div className="border-t border-outline-variant py-3">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  className="flex items-center gap-5 px-7 py-3 text-[22px] text-on-surface transition hover:bg-surface-container-low"
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-on-surface-variant" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-outline-variant p-4">
            <button
              className="flex w-full items-center gap-6 rounded-md px-3 py-2 text-left text-xl text-error transition hover:bg-error-container"
              type="button"
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      ) : null}

      {authOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[calc(100vh-48px)] w-full max-w-md overflow-y-auto rounded-xl border border-outline-variant bg-white p-6 shadow-md sm:p-8">
            <button
              aria-label="Close account dialog"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-secondary transition hover:bg-surface-container"
              type="button"
              onClick={() => setAuthOpen(false)}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

            <div className="mb-6 flex justify-center">
              <Image
                alt="truzov"
                className="h-9 w-auto"
                height={40}
                src="/truzov-logo.png"
                width={160}
              />
            </div>

            <div className="mb-6 text-center">
              <h2 className="font-body text-2xl font-semibold leading-tight text-primary">
                Login with OTP
              </h2>
              <p className="mt-2 text-base leading-relaxed text-secondary">
                Sign in to access your verified dashboard
              </p>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              {authStep === 'phone' ? (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">
                    Phone Number
                  </span>
                  <div className="flex h-12 overflow-hidden rounded-lg border border-neutral-mid-gray bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <span className="grid w-14 place-items-center border-r border-neutral-mid-gray text-base text-on-surface-variant">
                      +91
                    </span>
                    <input
                      className="min-w-0 flex-1 border-0 px-4 text-base outline-none"
                      inputMode="numeric"
                      name="phone"
                      placeholder="9876543210"
                      type="tel"
                    />
                  </div>
                </label>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
                    OTP sent to <span className="font-semibold text-on-surface">+91 {phone}</span>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">
                      Enter OTP
                    </span>
                    <input
                      autoFocus
                      className="h-12 rounded-lg border border-neutral-mid-gray px-4 text-center text-xl font-semibold tracking-[0.3em] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                      inputMode="numeric"
                      maxLength={6}
                      name="otp"
                      placeholder="123456"
                      type="text"
                    />
                  </label>
                </div>
              )}

              {formError || error ? (
                <p className="rounded-lg bg-error-container p-3 text-sm text-error">
                  {formError || error}
                </p>
              ) : null}

              <Button
                className="h-12 w-full rounded-lg bg-primary-container text-base font-bold text-white shadow-sm hover:bg-primary"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : null}
                {authStep === 'phone' ? 'Send OTP' : 'Verify OTP'}
              </Button>
            </form>

            {authStep === 'otp' ? (
              <button
                className="mt-3 w-full text-center text-sm font-semibold text-accent-link hover:underline"
                type="button"
                onClick={() => {
                  setAuthStep('phone');
                  setFormError(null);
                  clearError();
                }}
              >
                Change phone number
              </button>
            ) : null}

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-light-gray" />
              </div>
              <span className="relative bg-white px-4 text-xs font-semibold uppercase text-secondary">
                Or sign up with
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-mid-gray px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-neutral-light-gray"
                type="button"
                onClick={() => completeSocialLogin('customer')}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full border border-neutral-mid-gray text-xs font-bold text-primary">
                  G
                </span>
                Google
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-mid-gray px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-neutral-light-gray"
                type="button"
                onClick={() => completeSocialLogin('vendor')}
              >
                <IdCard aria-hidden="true" className="h-5 w-5" />
                Vendor ID
              </button>
            </div>

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
      ) : null}
    </div>
  );
}
