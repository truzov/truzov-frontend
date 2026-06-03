import { CheckoutProgress, SecureCheckoutMark } from '@/components/checkout/CheckoutProgress';
import { Logo } from './Logo';

export function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-raised">
      <header className="border-b border-surface-border bg-surface-base">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4">
          <Logo />
          <CheckoutProgress />
          <SecureCheckoutMark />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
