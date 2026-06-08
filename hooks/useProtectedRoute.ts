'use client';

import { useAuthStore } from '@/store/auth.store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useProtectedRoute(redirectTo = '/login') {
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

  return { isLoggedIn, isLoading };
}
