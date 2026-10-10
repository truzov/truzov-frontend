'use client';

import { ShieldCheck, CircleUserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AccountSidebar } from '@/components/screens/CustomerScreens';
import { EmptyState } from '@/components/ui/EmptyState';
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
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,246,1)_100%)]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 lg:px-6">
          <div className="grid w-full gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-surface-border bg-white p-5 shadow-sm">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
              <div className="mt-5 grid gap-2">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
              </div>
            </div>
            <div className="rounded-3xl border border-surface-border bg-white p-6 shadow-sm">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-1/2" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    // Child routes have no `redirectTo`-less path here: useProtectedRoute('/login') above
    // already redirected them. This branch is only reachable on the bare /account index.
    if (!isAccountIndex) {
      return null;
    }

    return (
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 lg:px-6">
        <EmptyState
          action="Login / Signup"
          icon={CircleUserRound}
          message="Sign in to view orders, saved addresses, and your profile."
          title="You're not signed in"
          onAction={() => openAuthModal({ mode: 'login', redirectTo: '/account' })}
        />
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
