import { AddressesScreenSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading addresses...">
      <AddressesScreenSkeleton />
    </div>
  );
}
