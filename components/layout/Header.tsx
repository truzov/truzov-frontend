'use client';

import { Heart, Search, ShoppingCart, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CartDrawer } from '@/components/commerce/CartDrawer';
import { useCartStore } from '@/store/cart.store';
import { useUiStore } from '@/store/ui.store';
import { Logo } from './Logo';

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const openCart = useUiStore((state) => state.openCart);
  const itemCount = useCartStore((state) => state.itemCount());

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-surface-border bg-surface-base shadow-xs">
        <div className="bg-brand-primary text-text-inverse">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs font-semibold">
            <span>Lab Tested</span>
            <span>Authentic Products</span>
            <span>India&apos;s Verified Health Marketplace</span>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 lg:grid-cols-[140px_1fr_auto] lg:items-center">
          <div className="flex items-center justify-between">
            <Logo />
            <Button aria-label="Open cart" className="relative lg:hidden" size="icon" variant="ghost" onClick={openCart}>
              <ShoppingCart aria-hidden="true" className="h-5 w-5" />
              {itemCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-accent px-1 text-xs text-text-inverse">
                  {itemCount}
                </span>
              ) : null}
            </Button>
          </div>
          <form
            className="flex h-11 overflow-hidden rounded-md border border-surface-border bg-surface-base"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(`/search?q=${encodeURIComponent(query)}`);
            }}
          >
            <input
              className="min-w-0 flex-1 px-4 text-sm outline-none"
              placeholder="Search organic products, brands, categories..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button aria-label="Search" className="rounded-none" size="icon" type="submit">
              <Search aria-hidden="true" className="h-5 w-5" />
            </Button>
          </form>
          <nav className="hidden items-center gap-2 lg:flex">
            <Link href="/wishlist">
              <Button variant="ghost">
                <Heart aria-hidden="true" className="h-4 w-4" />
                Wishlist
              </Button>
            </Link>
            <Button className="relative" variant="ghost" onClick={openCart}>
              <ShoppingCart aria-hidden="true" className="h-4 w-4" />
              Cart
              {itemCount > 0 ? (
                <span aria-live="polite" className="rounded-full bg-brand-accent px-1.5 text-xs text-text-inverse">
                  {itemCount}
                </span>
              ) : null}
            </Button>
            <Link href="/account">
              <Button variant="ghost">
                <UserRound aria-hidden="true" className="h-4 w-4" />
                Account
              </Button>
            </Link>
          </nav>
        </div>
        <nav className="hidden border-t border-surface-border lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-2 text-sm font-semibold text-text-secondary">
            <Link href="/products">Shop</Link>
            <Link href="/category/honey">Honey</Link>
            <Link href="/trust/how-it-works">Why Verified?</Link>
            <Link href="/trust/lab-reports">Lab Reports</Link>
            <Link className="ml-auto rounded-sm bg-brand-primary px-4 py-2 text-text-inverse" href="/products?labVerified=true">
              Explore Verified Products
            </Link>
          </div>
        </nav>
      </header>
      <CartDrawer />
    </>
  );
}
