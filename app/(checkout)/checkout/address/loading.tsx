import { CheckoutScreenSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading checkout...">
      <CheckoutScreenSkeleton />
    </div>
  );
}
