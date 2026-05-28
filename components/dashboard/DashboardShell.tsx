'use client';

import { BarChart3, Boxes, ClipboardCheck, FileText, Home, LogOut, Package, Settings, ShieldCheck, Truck, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/types';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils/cn';

const nav = {
  vendor: [
    { href: '/vendor', label: 'Dashboard', icon: Home },
    { href: '/vendor/products', label: 'Products', icon: Package },
    { href: '/vendor/inventory', label: 'Inventory', icon: Boxes },
    { href: '/vendor/orders', label: 'Orders', icon: Truck },
    { href: '/vendor/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/vendor/payouts', label: 'Payouts', icon: FileText },
    { href: '/vendor/verification', label: 'Verification', icon: ShieldCheck },
  ],
  admin: [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/vendors', label: 'Vendors', icon: Users },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/verification', label: 'Verification', icon: ClipboardCheck },
    { href: '/admin/orders', label: 'Orders', icon: Truck },
    { href: '/admin/content', label: 'Content', icon: FileText },
    { href: '/admin/config', label: 'Config', icon: Settings },
    { href: '/admin/roles', label: 'Roles', icon: Users },
  ],
  lab: [
    { href: '/lab', label: 'Dashboard', icon: Home },
    { href: '/lab/requests', label: 'Requests', icon: ClipboardCheck },
    { href: '/lab/upload', label: 'Upload Report', icon: FileText },
  ],
};

export function DashboardShell({
  role,
  title,
  children,
}: {
  role: UserRole;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const loginAs = useAuthStore((state) => state.loginAs);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-surface-raised text-text-primary lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-surface-border bg-surface-base">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <Logo />
          <p className="mt-2 text-sm capitalize text-text-secondary">{role} workspace</p>
          <nav className="mt-8 grid gap-1">
            {nav[role as keyof typeof nav].map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold',
                    active ? 'bg-brand-light text-brand-primary' : 'text-text-secondary hover:bg-surface-raised'
                  )}
                  href={item.href}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto grid gap-2">
            <Button variant="outline" onClick={() => loginAs(role)}>
              Demo {role} login
            </Button>
            <Button variant="ghost" onClick={logout}>
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
      <main className="min-w-0">
        <div className="border-b border-surface-border bg-surface-base px-6 py-5">
          <h1 className="font-heading text-3xl">{title}</h1>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
