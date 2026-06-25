import { ProductListingScreenSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading search results...">
      <ProductListingScreenSkeleton />
    </div>
  );
}
