'use client';

import { useAuthStore } from '@/store/auth.store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      const nextUrl =
        redirectTo === '/login' ? `${redirectTo}?redirect=${encodeURIComponent(pathname)}` : redirectTo;
      router.push(nextUrl);
    }
  }, [isLoggedIn, isLoading, pathname, router, redirectTo]);

  // Show nothing while loading
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only show children if logged in
  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
