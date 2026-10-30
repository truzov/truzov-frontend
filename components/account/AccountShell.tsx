'use client';

import { ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AccountSidebar } from '@/components/screens/CustomerScreens';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Only the bare /account index can render a guest-facing card in place of the redirect —
  // child routes (orders, addresses, settings) have no guest view and must keep redirecting.
  const isAccountIndex = pathname === '/account';
  const { isLoggedIn, isLoading } = useProtectedRoute(isAccountIndex ? false : '/login');
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const user = useAuthStore((state) => state.user);
  const userName = user?.name ?? 'Account';
  const userEmail = user?.email;

  if (isLoading) {
    return <div aria-busy="true" role="status" className="mx-auto max-w-lg px-4 py-8"><Skeleton className="h-11 w-40" /><span className="sr-only">Loading account…</span></div>;
  }

  if (!isLoggedIn) {
    // Child routes have no `redirectTo`-less path here: useProtectedRoute('/login') above
    // already redirected them. This branch is only reachable on the bare /account index.
    if (!isAccountIndex) {
      return null;
    }

    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <button className="min-h-11 rounded-lg bg-[#04342c] px-5 text-sm text-white" type="button" onClick={() => openAuthModal({ mode: 'login', redirectTo: '/account' })}>Login / Signup</button>
      </div>
    );
  }

  return (
    <div className="account-shell min-h-[70vh] bg-[#fdfbf7]">
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-6 lg:px-6 lg:pb-20 lg:pt-8">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-[#04342c] px-6 py-9 text-[#e1f5ee] sm:px-10 sm:py-11">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-[#b9e8d8]/20" aria-hidden="true" />
          <div className="absolute -right-4 -top-12 h-56 w-56 rounded-full border border-[#b9e8d8]/15" aria-hidden="true" />
          <p className="relative text-xs font-medium uppercase tracking-[0.18em] text-[#bfe5d8]">your truzov account</p>
          <h1 className="relative mt-3 max-w-[750px] break-words text-[clamp(29px,4vw,45px)] font-medium leading-tight tracking-[-.04em]">Welcome back, {userName}</h1>
          {userEmail ? <p className="relative mt-3 [overflow-wrap:anywhere] text-base text-[#bfe5d8]">{userEmail}</p> : null}
          <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-[#b9e8d8]/35 bg-white/10 px-3 py-2 text-xs text-[#d7f2e7]"><ShieldCheck aria-hidden="true" className="h-4 w-4" /> your details, all in one place</div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-7">
          <AccountSidebar userName={userName} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
