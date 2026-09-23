import type { ProductListParams } from '@/lib/api/endpoints/catalog';

/**
 * Every React Query cache key in one place.
 *
 * Centralised because invalidation is where ad-hoc key strings go wrong: a mutation that
 * invalidates `['cart']` will not touch a query registered as `['cart', 'current']`, and the
 * failure is silent — stale numbers on screen with no error anywhere. Deriving both from the
 * same factory makes that impossible.
 *
 * Keys are arrays ordered general -> specific, so a prefix invalidation (`queryKeys.products()`)
 * clears every filtered variation beneath it.
 */
export const queryKeys = {
  home: () => ['home'] as const,
  categories: () => ['categories'] as const,
  banners: (placement?: string) => ['banners', placement ?? 'all'] as const,

  products: () => ['products'] as const,
  productList: (params: ProductListParams) => ['products', 'list', params] as const,
  productSearch: (params: ProductListParams) => ['products', 'search', params] as const,
  product: (slugOrId: string) => ['products', 'detail', slugOrId] as const,
  productReviews: (slugOrId: string, page: number) =>
    ['products', 'detail', slugOrId, 'reviews', page] as const,
  productRelated: (slugOrId: string) => ['products', 'detail', slugOrId, 'related'] as const,
  productsByIds: (ids: string[]) =>
    // Sorted so two calls with the same ids in a different order share one cache entry.
    ['products', 'batch', [...ids].sort().join(',')] as const,
  searchSuggestions: (q: string) => ['search', 'suggestions', q] as const,

  labReports: (page: number) => ['lab-reports', page] as const,

  currentUser: () => ['auth', 'me'] as const,
  addresses: () => ['addresses'] as const,
  cart: () => ['cart'] as const,
  wishlist: () => ['wishlist'] as const,
  orders: () => ['orders'] as const,
  orderList: (page: number) => ['orders', 'list', page] as const,
  order: (orderId: string) => ['orders', 'detail', orderId] as const,
} as const;
