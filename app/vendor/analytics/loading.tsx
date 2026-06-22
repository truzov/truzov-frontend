import { DashboardScreenSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading analytics...">
      <DashboardScreenSkeleton />
    </div>
  );
}
