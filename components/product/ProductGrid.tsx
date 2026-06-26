import type { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

export function ProductGrid({
  products,
  priorityCount = 0,
  loading = false,
}: {
  products: Product[];
  priorityCount?: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid self-start grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid self-start grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product, index) => (
        <ProductCard key={product.id} priority={index < priorityCount} product={product} />
      ))}
    </div>
  );
}
