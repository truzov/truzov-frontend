'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthEventBridge } from '@/components/auth/AuthEventBridge';
import { AuthModal } from '@/components/auth/AuthModal';
import { Toaster } from '@/components/ui/Toaster';
import { isRetryableError } from '@/lib/api/errors';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            /**
             * The default `retry: 1` retried everything, which is wrong in both directions
             * against this API.
             *
             * 4xx are deterministic: a 404, a validation error or a 403 will fail identically
             * on a second attempt, so retrying only delays the message the user needs. 429 is
             * excluded even though it is transient, because the reference is explicit that a
             * rate limit must be respected via Retry-After — hammering a limiter is how a
             * client earns a longer block. 5xx and genuine network failures do get one retry.
             */
            retry: (failureCount, error) => failureCount < 1 && isRetryableError(error),
          },
          mutations: {
            // Never automatic for mutations: a retried POST /cart/items or POST /checkout can
            // double-add a line or place a second order. Retrying is the user's decision.
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Restores the session and owns auth-driven redirects. Must sit inside the query
          provider, since it clears the cache when a session dies. */}
      <AuthEventBridge />
      {children}
      <AuthModal />
      <Toaster />
    </QueryClientProvider>
  );
}
