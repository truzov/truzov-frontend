'use client';

import { Heart, Home, Search, Shapes, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Categories', icon: Shapes },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account', label: 'Account', icon: UserRound },
];

export function MobileNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/checkout')) {
    return null;
  }

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
      </div>
    </nav>
  );
}
