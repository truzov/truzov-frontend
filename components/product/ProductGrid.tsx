import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { ProductSummaryDto } from '@/types/api';
import { ProductCard } from './ProductCard';

export function ProductGrid({
  products,
  priorityCount = 0,
  loading = false,
  skeletonCount = 8,
}: {
  products: ProductSummaryDto[];
  /** How many images to mark `priority`, for above-the-fold LCP. */
  priorityCount?: number;
  loading?: boolean;
  skeletonCount?: number;
}) {
  const gridClass =
    'product-grid grid self-start grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4';

  if (loading) {
    return (
      <div aria-busy="true" className={gridClass} role="status">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product, index) => (
        <ProductCard key={product.id} priority={index < priorityCount} product={product} />
      ))}
    </div>
  );
}
