import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-surface-border bg-surface-base p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={`h-14 rounded-md ${i === 4 ? 'md:col-span-2' : ''}`} />
          ))}
          <Skeleton className="h-14 rounded-md md:col-span-2" />
        </div>
        <Skeleton className="mt-5 h-10 w-48 rounded-md" />
      </div>
    </div>
  );
}
