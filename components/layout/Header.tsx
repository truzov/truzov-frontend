'use client';

import { Heart, LogOut, Menu, Search, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { useCartItemCount } from '@/hooks/api/useCart';
import { useCategories } from '@/hooks/api/useCatalog';
import { Logo } from './Logo';

export function Header() {
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const count = useCartItemCount();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (menuOpen || searchOpen)) {
        setMenuOpen(false);
        setSearchOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen, searchOpen]);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const logout = useAuthStore((state) => state.logout);
  const [loggingOut, setLoggingOut] = useState(false);
  const categoryHref = (term: string) => {
    const item = categories.find((category) => category.isActive && `${category.name} ${category.slug}`.toLowerCase().includes(term));
    return item ? `/category/${item.slug}` : '/products';
  };
  const links = [
    { label: 'shop', href: '/products' },
    { label: 'offers & coupons', href: '/offers' },
    ...(categories.some((category) => category.isActive && `${category.name} ${category.slug}`.toLowerCase().includes('personal')) ? [{ label: 'personal care', href: categoryHref('personal') }] : []),
    ...(categories.some((category) => category.isActive && `${category.name} ${category.slug}`.toLowerCase().includes('food')) ? [{ label: 'food', href: categoryHref('food') }] : []),
    { label: 'our verification process', href: '/trust/how-it-works' },
    { label: 'lab reports', href: '/trust/lab-reports' },
  ];

  return <header ref={headerRef} className="sticky top-0 z-50 border-b border-[#dce6d8] bg-[#fdfbf7]/95 font-body text-[#04342c] backdrop-blur-md">
    <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2" href="#main-content">skip to content</a>
    <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-2 px-4 sm:gap-4 md:px-8 min-[1536px]:gap-4">
      <button ref={menuButtonRef} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="store-menu" className="grid h-11 w-11 place-items-center rounded-md hover:bg-[#eaf3de] min-[1536px]:hidden" onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }} type="button">{menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}</button>
      <Logo className="mr-auto w-[96px] min-[1536px]:w-[112px]" />
      <nav aria-label="Main navigation" className="hidden items-center gap-3 min-[1536px]:gap-4 min-[1536px]:flex">{links.map((link) => <Link className="whitespace-nowrap text-[13px] transition-colors hover:text-[#d85a30]" href={link.href} key={link.label}>{link.label}</Link>)}</nav>
      <form className="ml-auto hidden h-11 w-[min(19vw,230px)] items-center gap-2.5 rounded-lg bg-[#eaf0e6] px-3 min-[1536px]:flex" onSubmit={(event) => { event.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`); }} role="search">
        <Search aria-hidden="true" size={18} /><input aria-label="Search products" className="search-input min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#5e7569]" onChange={(event) => setQuery(event.target.value)} placeholder="search products" value={query} />
      </form>
      <button aria-label="Search" aria-expanded={searchOpen} className="grid h-11 w-11 place-items-center rounded-md hover:bg-[#eaf3de] min-[1536px]:hidden" onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }} type="button"><Search aria-hidden="true" size={20} /></button>
      <Link aria-label="Wishlist" className="grid h-11 w-11 place-items-center rounded-md hover:bg-[#eaf3de]" href="/wishlist"><Heart aria-hidden="true" size={20} /></Link>
      <AccountMenu className="hidden min-[1536px]:block" />
      <Link aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'} className="relative grid h-11 w-11 place-items-center rounded-md hover:bg-[#eaf3de]" href="/cart"><ShoppingCart aria-hidden="true" size={20} />{count > 0 && <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#d85a30] px-1 text-[10px] text-white">{count}</span>}</Link>
    </div>
    {searchOpen && <form className="absolute inset-x-0 top-full flex gap-2 bg-[#fdfbf7] shadow-lg border-t border-[#dce6d8] p-3 min-[1536px]:hidden" onSubmit={(event) => { event.preventDefault(); if (query.trim()) { router.push(`/search?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); } }} role="search"><input autoFocus aria-label="Search products" className="search-input min-w-0 flex-1 rounded-md border-0 bg-white px-3 py-2 outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="search products" value={query} /><button className="min-h-11 rounded-md bg-[#04342c] px-4 text-white" type="submit">search</button></form>}
    {menuOpen && <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full shadow-lg max-h-[calc(100dvh-70px)] overflow-y-auto border-t border-[#dce6d8] bg-[#fdfbf7] px-5 py-3 min-[1536px]:hidden" id="store-menu">{[...links, { label: 'account', href: '/account' }, { label: 'wishlist', href: '/wishlist' }, { label: 'support & tickets', href: '/support/tickets' }, { label: 'seller support', href: '/support/seller' }].map((link) => <Link className="flex min-h-12 items-center border-b border-[#e4e8dd] text-[15px]" href={link.href} key={link.label} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
      {isLoggedIn && <button className="flex min-h-12 w-full items-center gap-3 text-left text-[15px] text-[#b44d30] disabled:opacity-50" disabled={loggingOut} type="button" onClick={async () => { setLoggingOut(true); try { await logout(); setMenuOpen(false); router.push('/'); } finally { setLoggingOut(false); } }}><LogOut aria-hidden="true" size={20} />{loggingOut ? 'Logging out…' : 'Log out'}</button>}
    </nav>}
  </header>;
}
