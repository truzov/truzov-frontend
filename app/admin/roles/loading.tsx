import { DataTableSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading roles..." className="p-6">
      <DataTableSkeleton rows={5} cols={3} />
    </div>
  );
}
