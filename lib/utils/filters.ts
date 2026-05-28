import type { Product } from '@/types';

export interface ProductFilterState {
  category?: string;
  brand?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStock?: boolean;
  labVerified?: boolean;
  query?: string;
}

export function parseFilters(params: URLSearchParams): ProductFilterState {
  return {
    category: params.get('category') ?? undefined,
    brand: params.get('brand') ?? undefined,
    sort: params.get('sort') ?? 'relevance',
    minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
    maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    tags: params.get('tags')?.split(',').filter(Boolean),
    inStock: params.get('inStock') === 'true' ? true : undefined,
    labVerified: params.get('labVerified') === 'true' ? true : undefined,
    query: params.get('q') ?? undefined,
  };
}

export function filterProducts(products: Product[], filters: ProductFilterState) {
  const query = filters.query?.toLowerCase().trim();

  const filtered = products.filter((product) => {
    if (filters.category && product.category !== filters.category && !product.tags.includes(filters.category)) {
      return false;
    }
    if (filters.brand && product.brand !== filters.brand) {
      return false;
    }
    if (filters.minPrice && product.price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice && product.price > filters.maxPrice) {
      return false;
    }
    if (filters.inStock && !product.inStock) {
      return false;
    }
    if (filters.labVerified && !product.isLabVerified) {
      return false;
    }
    if (filters.tags?.length && !filters.tags.some((tag) => product.tags.includes(tag))) {
      return false;
    }
    if (
      query &&
      ![product.name, product.brand, product.category, ...product.tags].some((value) =>
        value.toLowerCase().includes(query)
      )
    ) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'best_rated':
        return b.rating - a.rating;
      case 'best_selling':
        return Number(b.isBestseller) - Number(a.isBestseller);
      case 'newest':
        return Number(b.isNewArrival) - Number(a.isNewArrival);
      default:
        return Number(b.isFeatured) - Number(a.isFeatured);
    }
  });
}
