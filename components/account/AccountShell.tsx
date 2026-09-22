'use client';

import { UserRound } from 'lucide-react';
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
          icon={UserRound}
          message="Sign in to view orders, saved addresses, and your profile."
          title="You're not signed in"
          onAction={() => openAuthModal({ mode: 'login', redirectTo: '/account' })}
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,246,1)_100%)]">
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(0,128,38,0.12),transparent_50%),radial-gradient(circle_at_top_right,rgba(85,174,76,0.12),transparent_45%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-primary">
            Account
          </p>
          <h1 className="mt-2 font-heading text-3xl text-text-primary">Welcome, {userName}</h1>
          {userEmail ? <p className="mt-1 text-sm text-text-secondary">{userEmail}</p> : null}
        </div>
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <AccountSidebar userName={userName} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
