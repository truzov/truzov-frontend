import Link from 'next/link';
import { Logo } from './Logo';

export function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-raised">
      <header className="border-b border-surface-border bg-surface-base">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <Link className="text-sm font-semibold text-brand-primary" href="/cart">
            Back to cart
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
