'use client';

import { usePathname } from 'next/navigation';
import { CheckoutProgress, SecureCheckoutMark } from '@/components/checkout/CheckoutProgress';
import { Logo } from './Logo';

export function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConfirmation = pathname.includes('/checkout/confirm');

  return (
    <div className="checkout-shell min-h-screen bg-[#fdfbf7] text-[#04342c]">
      <header className="border-b border-[#dce6d8] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:py-4 lg:px-6">
          <Logo />
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
            <CheckoutProgress active={isConfirmation ? 3 : undefined} />
          </div>
          <SecureCheckoutMark />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10 lg:px-6">{children}</main>
    </div>
  );
}
