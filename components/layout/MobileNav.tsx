'use client';

import { Heart, Home, Search, LayoutGrid, CircleUserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuthModalActions } from '@/store/auth-modal.store';
import { useAppSelector } from '@/store/redux';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Categories', icon: LayoutGrid },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

export function MobileNav() {
  const pathname = usePathname();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const status = useAppSelector((state) => state.auth.status);
  const { openAuthModal } = useAuthModalActions();

  if (pathname.startsWith('/checkout')) {
    return null;
  }

  const resolving = status === 'idle' || status === 'restoring';
  const accountActive = isLoggedIn ? pathname.startsWith('/account') : pathname === '/login';
  const accountClassName = cn(
    'grid min-w-0 place-items-center gap-0.5 px-0.5 text-center text-[10px] font-semibold leading-tight sm:text-[11px]',
    accountActive ? 'text-brand-primary' : 'text-text-muted'
  );
  const accountIcon = <CircleUserRound aria-hidden="true" className="h-5 w-5" />;

  return (
    <nav aria-label="Bottom navigation" className="navigation-labels mobile-account-nav fixed bottom-0 left-0 right-0 z-40 border-t border-[#dce6d8] bg-white pb-[env(safe-area-inset-bottom)] text-[#04342c] min-[1536px]:hidden">
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

        {resolving ? (
          <span className={accountClassName}>{accountIcon}Account</span>
        ) : isLoggedIn ? (
          <Link className={accountClassName} href="/account">
            {accountIcon}
            My Account
          </Link>
        ) : (
          <button
            className={accountClassName}
            type="button"
            onClick={() => openAuthModal({ mode: 'login', redirectTo: '/account' })}
          >
            {accountIcon}
            <span>Account</span>
          </button>
        )}
      </div>
    </nav>
  );
}
