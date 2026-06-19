import { LabReportsScreenSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading lab history...">
      <LabReportsScreenSkeleton />
    </div>
  );
}
