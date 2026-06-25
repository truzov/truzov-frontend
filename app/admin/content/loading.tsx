import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading content..." className="p-6">
      <div className="rounded-lg border border-surface-border bg-surface-base p-6">
        <Skeleton className="h-7 w-48 mb-5" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={`h-14 rounded-md ${i === 2 ? 'md:col-span-2' : ''}`} />
          ))}
        </div>
        <Skeleton className="mt-5 h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
