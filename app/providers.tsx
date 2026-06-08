'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { Toaster } from '@/components/ui/Toaster';

function MockServiceWorker() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MSW_ENABLED !== 'true') {
      return;
    }

    void import('@/mocks/browser').then(({ worker }) => {
      void worker.start({ onUnhandledRequest: 'bypass' });
    });
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MockServiceWorker />
      {children}
      <AuthModal />
      <Toaster />
    </QueryClientProvider>
  );
}
