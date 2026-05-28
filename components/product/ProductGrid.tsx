import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product, index) => (
        <ProductCard key={product.id} priority={index < priorityCount} product={product} />
      ))}
    </div>
  );
}
