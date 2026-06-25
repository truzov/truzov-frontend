import { OrderDetailScreenSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading order details...">
      <OrderDetailScreenSkeleton />
    </div>
  );
}

