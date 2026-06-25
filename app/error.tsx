'use client';

import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-surface-onVariant">We couldn't load this page. Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
