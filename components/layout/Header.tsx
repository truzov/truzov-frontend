'use client';

import {
  BadgeCheck,
  ChevronDown,
  FlaskConical,
  Heart,
  Search,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { useCartItemCount } from '@/hooks/api/useCart';
import { Logo } from './Logo';

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  // Server-provided count from the same cache entry the cart page reads, so the badge cannot drift
  // from the cart. Previously summed from a persisted local cart. Zero for guests, who have no cart.
  const itemCount = useCartItemCount();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [policiesOpen, setPoliciesOpen] = useState(false);
  const policiesRef = useRef<HTMLDivElement>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!policiesRef.current?.contains(target)) {
        setPoliciesOpen(false);
      }
      if (!supportRef.current?.contains(target)) {
        setSupportOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-white font-body shadow-xs">
        <div className="bg-primary text-on-primary">
          <div className="mx-auto hidden max-w-[1440px] items-center justify-center gap-8 px-6 py-2 text-[13px] font-semibold lg:flex">
            {(
              [
                [FlaskConical, 'Lab Tested'],
                [BadgeCheck, 'Authentic Products'],
                [Users, 'Trusted Vendors'],
                [ShieldCheck, 'Transparency You Can Trust'],
                [Heart, "India's Verified Health Marketplace"],
              ] as Array<[typeof FlaskConical, string]>
            ).map(([Icon, label]) => (
              <span key={label} className="flex items-center gap-2 whitespace-nowrap">
                <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="mx-auto grid max-w-[1440px] gap-3 px-4 py-3 lg:grid-cols-[140px_1fr_auto] lg:items-center lg:gap-10 lg:px-6 lg:py-5">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-1 lg:hidden">
              <AccountMenu />
              <Link
                aria-label="Open cart"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-brand-primary hover:bg-brand-light"
                href="/cart"
              >
                <ShoppingCart aria-hidden="true" className="h-5 w-5" />
                {isMounted && itemCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-on-primary">
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
          <form
            className="flex h-12 min-w-0 overflow-hidden rounded-lg border border-outline-variant bg-background lg:max-w-[800px]"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = query.trim();
              if (trimmed) {
                router.push(`/search?q=${encodeURIComponent(trimmed)}`);
              }
            }}
          >
            <button
              className="hidden items-center gap-2 border-r border-outline-variant px-4 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container-low md:flex"
              type="button"
            >
              All Categories
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-outline" />
            </button>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-on-surface outline-none placeholder:text-outline"
              placeholder="Search verified products, brands, categories..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              aria-label="Search"
              className="h-full w-16 rounded-none bg-primary text-on-primary hover:bg-primary/90"
              size="icon"
              type="submit"
            >
              <Search aria-hidden="true" className="h-5 w-5" />
            </Button>
          </form>
          <nav className="hidden items-center gap-6 lg:flex">
            <span className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface-container-low px-5 py-2.5 text-sm font-bold text-primary">
              <BadgeCheck aria-hidden="true" className="h-5 w-5" />
              truzov Verified
            </span>
            <AccountMenu />
            <Link href="/wishlist">
              <Button
                className="px-0 text-on-surface hover:bg-transparent hover:text-primary"
                variant="ghost"
              >
                <Heart aria-hidden="true" className="h-7 w-7" />
                Wishlist
              </Button>
            </Link>
            <Link
              className="relative inline-flex items-center gap-2 px-0 text-on-surface hover:text-primary"
              href="/cart"
            >
              <ShoppingCart aria-hidden="true" className="h-7 w-7" />
              Cart
              {isMounted && itemCount > 0 ? (
                <span
                  aria-live="polite"
                  className="absolute -right-3 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary"
                >
                  {itemCount}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>
        <nav className="hidden border-y border-outline-variant/70 bg-white lg:block">
          <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-6 py-3 text-sm font-semibold text-on-surface">
            <Link className="flex items-center gap-1 hover:text-primary" href="/products">
              Shop
            </Link>
            <Link className="hover:text-primary" href="/products">
              Brands
            </Link>
            <Link href="/trust/how-it-works">Why Verified?</Link>
            <Link href="/trust/lab-reports">Lab Reports</Link>
            <Link href="/trust/how-it-works">About Us</Link>
            <div ref={policiesRef} className="relative">
              <button
                onClick={() => setPoliciesOpen(!policiesOpen)}
                className="flex items-center gap-1 hover:text-primary font-semibold transition"
                aria-expanded={policiesOpen}
                type="button"
              >
                Policies
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </button>
              {policiesOpen && (
                <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-48 rounded-lg border border-outline-variant bg-white p-1.5 shadow-md">
                  <Link
                    href="/policies/refund-policy"
                    onClick={() => setPoliciesOpen(false)}
                    className="block rounded-md px-3.5 py-2 text-sm text-text-secondary transition hover:bg-surface-raised hover:text-primary font-semibold"
                  >
                    Refund Policy
                  </Link>
                  <Link
                    href="/policies/shipping-policy"
                    onClick={() => setPoliciesOpen(false)}
                    className="block rounded-md px-3.5 py-2 text-sm text-text-secondary transition hover:bg-surface-raised hover:text-primary font-semibold"
                  >
                    Shipping Policy
                  </Link>
                  <Link
                    href="/policies/privacy-policy"
                    onClick={() => setPoliciesOpen(false)}
                    className="block rounded-md px-3.5 py-2 text-sm text-text-secondary transition hover:bg-surface-raised hover:text-primary font-semibold"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/policies/terms-of-service"
                    onClick={() => setPoliciesOpen(false)}
                    className="block rounded-md px-3.5 py-2 text-sm text-text-secondary transition hover:bg-surface-raised hover:text-primary font-semibold"
                  >
                    Terms of Service
                  </Link>
                </div>
              )}
            </div>
            <div ref={supportRef} className="relative">
              <button
                onClick={() => setSupportOpen(!supportOpen)}
                className="flex items-center gap-1 hover:text-primary font-semibold transition"
                aria-expanded={supportOpen}
                type="button"
              >
                Support
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </button>
              {supportOpen && (
                <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-48 rounded-lg border border-outline-variant bg-white p-1.5 shadow-md">
                  <Link
                    href="/support/customer"
                    onClick={() => setSupportOpen(false)}
                    className="block rounded-md px-3.5 py-2 text-sm text-text-secondary transition hover:bg-surface-raised hover:text-primary font-semibold"
                  >
                    Customer Support
                  </Link>
                  <Link
                    href="/support/seller"
                    onClick={() => setSupportOpen(false)}
                    className="block rounded-md px-3.5 py-2 text-sm text-text-secondary transition hover:bg-surface-raised hover:text-primary font-semibold"
                  >
                    Seller Support
                  </Link>
                </div>
              )}
            </div>
            <Link
              className="ml-auto rounded-lg bg-primary px-8 py-3 text-sm font-bold text-on-primary transition hover:bg-primary/90"
              href="/products?labVerified=true"
            >
              Explore Verified Products
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
