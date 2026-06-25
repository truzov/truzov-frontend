import { DataTableSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading orders..." className="p-6">
      <DataTableSkeleton rows={7} cols={5} />
    </div>
  );
}
