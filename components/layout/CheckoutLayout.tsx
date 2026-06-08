'use client';

import { usePathname } from 'next/navigation';
import { CheckoutProgress, SecureCheckoutMark } from '@/components/checkout/CheckoutProgress';
import { Logo } from './Logo';

export function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConfirmation = pathname.includes('/checkout/confirm');

  return (
    <div className="min-h-screen bg-surface-raised">
      <header className="border-b border-surface-border bg-surface-base">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <div className="flex-1">
            <CheckoutProgress active={isConfirmation ? 3 : undefined} />
          </div>
          <SecureCheckoutMark />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
