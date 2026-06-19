import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading wishlist..." className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="mb-6 h-10 w-32" />
      <ProductGridSkeleton count={6} />
    </div>
  );
}

