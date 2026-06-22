import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <section
      role="status"
      aria-label="Loading confirmation..."
      className="mx-auto max-w-3xl rounded-lg border border-surface-border bg-surface-base p-8 text-center"
    >
      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-16" />
            {i < 2 && <Skeleton className="h-px w-8" />}
          </div>
        ))}
      </div>
      <Skeleton className="mx-auto h-16 w-16 rounded-full" />
      <Skeleton className="mx-auto mt-5 h-10 w-72" />
      <Skeleton className="mx-auto mt-3 h-4 w-64" />
      <div className="mt-8 flex justify-center gap-3">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
    </section>
  );
}

