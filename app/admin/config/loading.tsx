import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading configuration..." className="p-6">
      <div className="grid gap-4 rounded-lg border border-surface-border bg-surface-base p-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
        <Skeleton className="h-10 w-36 rounded-md md:col-span-2" />
      </div>
    </div>
  );
}
