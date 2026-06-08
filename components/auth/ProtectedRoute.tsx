'use client';

import { type ReactNode } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { isLoggedIn, isLoading } = useProtectedRoute(redirectTo);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
