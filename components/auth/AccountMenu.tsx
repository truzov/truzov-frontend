'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils/cn';
import { Heart, LogOut, MapPin, ReceiptText, Settings, UserRound } from 'lucide-react';

const menuItems = [
  { label: 'My Account', href: '/account', icon: UserRound },
  { label: 'Orders', href: '/account/orders', icon: ReceiptText },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
  { label: 'Settings', href: '/account', icon: Settings },
];

export function AccountMenu({ className }: { className?: string }) {
  const { isLoggedIn, user, logout } = useAuthStore();
  const { isOpen: authOpen, openAuthModal } = useAuthModalStore();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const openAuth = () => {
    openAuthModal({ mode: 'login' });
    setMenuOpen(false);
  };

  const handleAccountClick = () => {
    if (isLoggedIn) {
      setMenuOpen((open) => !open);
      return;
    }

    openAuth();
  };

  const displayName = user?.name ?? 'Account';
  const displayEmail = user?.email ?? '';

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
                  className="flex items-center gap-5 px-7 py-3 text-on-surface transition hover:bg-surface-container-low"
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
              className="flex w-full items-center gap-6 rounded-md px-3 py-2 text-left text-error transition hover:bg-error-container"
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
    </div>
  );
}
