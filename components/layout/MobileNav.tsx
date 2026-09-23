'use client';

import { Heart, Home, Search, Shapes, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Categories', icon: Shapes },
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-surface-base lg:hidden">
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

        {isLoggedIn ? (
          <Link
            className={cn(
              'grid place-items-center gap-0.5 text-[11px] font-semibold',
              accountActive ? 'text-brand-primary' : 'text-text-muted'
            )}
            href="/account"
          >
            <UserRound aria-hidden="true" className="h-5 w-5" />
            Account
          </Link>
        ) : (
          <button
            className="grid place-items-center gap-0.5 text-[11px] font-semibold text-text-muted"
            type="button"
            onClick={() => openAuthModal({ mode: 'login', redirectTo: '/account' })}
          >
            <UserRound aria-hidden="true" className="h-5 w-5" />
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
