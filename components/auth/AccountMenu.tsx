'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils/cn';
import { Heart, LogOut, MapPin, ReceiptText, CircleUserRound } from 'lucide-react';

const menuItems = [
  { label: 'my account', href: '/account', icon: CircleUserRound },
  { label: 'orders', href: '/account/orders', icon: ReceiptText },
  { label: 'wishlist', href: '/wishlist', icon: Heart },
  { label: 'saved addresses', href: '/account/addresses', icon: MapPin },
];

export function AccountMenu({ className }: { className?: string }) {
  const { isLoggedIn, user, logout } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

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
        ref={buttonRef}
        aria-expanded={isLoggedIn ? menuOpen : undefined}
        aria-label="Account"
        aria-controls={isLoggedIn && menuOpen ? 'account-panel' : undefined}
        className="grid h-11 w-11 place-items-center rounded-full text-[#04342c] transition hover:bg-[#eaf3de]"
        type="button"
        onClick={handleAccountClick}
      >
        <CircleUserRound aria-hidden="true" className="h-5 w-5" />
      </button>

      {menuOpen && isLoggedIn ? (
        <div id="account-panel" className="absolute right-0 top-[calc(100%+12px)] z-[70] w-[min(328px,calc(100vw-24px))] overflow-visible rounded-2xl border border-[#dce6d8] bg-[#fdfbf7] p-2 text-[#04342c] shadow-[0_22px_55px_#04342c26]">
          <div className="rounded-xl bg-[#04342c] px-5 py-5 text-[#e1f5ee]">
            <p className="text-[11px] font-medium tracking-[.15em] text-[#a9d9c6]">YOUR SPACE</p>
            <p className="mt-3 truncate text-xl font-medium leading-tight">{displayName}</p>
            <p className="mt-1 truncate text-sm text-[#bfe5d8]">{displayEmail}</p>
          </div>
          <nav aria-label="Account" className="grid gap-0.5 py-2">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-4 text-[14px] text-[#04342c] transition-colors hover:bg-[#eaf3de] focus-visible:bg-[#eaf3de]"
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-[#346b54]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[#dce6d8] pt-2">
            <button
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 text-left text-[14px] text-[#b44d30] transition-colors hover:bg-[#fae8e0]"
              type="button"
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
              log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
