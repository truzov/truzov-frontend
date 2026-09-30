'use client';

import { Heart, Home, LogIn, Search, LayoutGrid, CircleUserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Categories', icon: LayoutGrid },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

export function MobileNav() {
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);

  if (pathname.startsWith('/checkout')) {
    return null;
  }

  const accountActive = pathname.startsWith('/account');

  // Guests get a reduced bar: the full tab set (Home/Categories/Search/Wishlist) is only
  // useful once there is an account behind it — Wishlist and Account both need one, and
  // Home/Categories/Search work without login anyway but are one tap away via the header.
  // Two clear paths forward beat five tabs where three lead to the same login prompt.
  if (!isLoggedIn) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#dce6d8] bg-white text-[#04342c] lg:hidden">
        <div className="grid h-14 grid-cols-2">
          <Link
            className={cn(
              'grid place-items-center gap-0.5 text-[11px] font-semibold',
              accountActive ? 'text-brand-primary' : 'text-text-muted'
            )}
            href="/account"
          >
            <CircleUserRound aria-hidden="true" className="h-5 w-5" />
            My Account
          </Link>
          <button
            className="grid place-items-center gap-0.5 text-[11px] font-semibold text-text-muted"
            type="button"
            onClick={() => openAuthModal({ mode: 'login', redirectTo: '/account' })}
          >
            <LogIn aria-hidden="true" className="h-5 w-5" />
            Login / Signup
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#dce6d8] bg-white text-[#04342c] lg:hidden">
      <div className="grid h-14 grid-cols-5">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              className={cn(
                'grid place-items-center gap-0.5 text-[11px] font-semibold',
                active ? 'text-brand-primary' : 'text-text-muted'
              )}
              href={tab.href}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}

        <Link
          className={cn(
            'grid place-items-center gap-0.5 text-[11px] font-semibold',
            accountActive ? 'text-brand-primary' : 'text-text-muted'
          )}
          href="/account"
        >
          <CircleUserRound aria-hidden="true" className="h-5 w-5" />
          Account
        </Link>
      </div>
    </nav>
  );
}
