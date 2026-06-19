import { HomeScreenSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading page...">
      <HomeScreenSkeleton />
    </div>
  );
}

