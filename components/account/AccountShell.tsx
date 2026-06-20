'use client';

import { AccountSidebar } from '@/components/screens/CustomerScreens';
import { useAuthStore } from '@/store/auth.store';

export function AccountShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const userName = user?.name ?? 'Guest';
  const userSummary = user?.email ?? 'Sign in to view your saved orders, addresses, and preferences.';

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,246,1)_100%)]">
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(0,128,38,0.12),transparent_50%),radial-gradient(circle_at_top_right,rgba(85,174,76,0.12),transparent_45%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-primary">
            Account
          </p>
          <h1 className="mt-2 font-heading text-3xl text-text-primary">Welcome, {userName}</h1>
          <p className="mt-1 text-sm text-text-secondary">{userSummary}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <AccountSidebar userName={userName} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
