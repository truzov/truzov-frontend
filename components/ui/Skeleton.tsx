import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-raised', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-md border border-surface-border bg-surface-base p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <Skeleton className="mt-4 h-9 w-full" />
    </div>
  );
}
