'use client';

import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_PRODUCT_LIMIT,
  getBanners,
  getCategories,
  getHome,
  getLabReports,
  getProduct,
  getProductReviews,
  getProductsByIds,
  getRelatedProducts,
  listProducts,
  searchProducts,
  type ProductListParams,
} from '@/lib/api/endpoints/catalog';
import { queryKeys } from '@/lib/api/queries';

/**
 * React Query hooks for the public storefront.
 *
 * Every hook passes the query's `signal` through to fetch, so navigating away mid-request
 * aborts it instead of leaving a response to be parsed and thrown away.
 *
 * Cache lifetimes are set per resource rather than relying on the 60s global default: the
 * catalogue changes far less often than a cart does, and refetching categories on every mount
 * is wasted traffic on data the backend itself caches for 10 minutes.
 */

/** Homepage aggregate — one request instead of banners + categories + three product lists. */
export function useHome() {
  return useQuery({
    queryKey: queryKeys.home(),
    queryFn: ({ signal }) => getHome(signal),
    staleTime: 5 * 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: ({ signal }) => getCategories(signal),
    // Matches the backend's own Caffeine TTL for this data (`cache-names: categories`,
    // expireAfterWrite=10m) — refetching more often than the server updates is pointless.
    staleTime: 10 * 60_000,
  });
}

/**
 * Banners for a placement.
 *
 * Exists as a separate hook because `GET /home` currently returns `banners: []` even when
 * `GET /banners?placement=hero` returns one — verified against the running backend on
 * 2026-08-22 with the seeded `ban_hero` record. The homepage therefore uses this as a fallback
 * so it is not silently heroless. `enabled` keeps it from firing when /home did supply banners,
 * so the extra request disappears on its own once the backend is fixed (plan §T8).
 */
export function useBanners(placement: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.banners(placement),
    queryFn: ({ signal }) => getBanners(placement, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Product listing. Routes to `/search` when there is a text query, because `/search` is the
 * endpoint that actually does full-text matching; `/products?q=` exists but `/search` is the
 * documented path for a query-led result set.
 */
export function useProductList(params: ProductListParams) {
  const withDefaults: ProductListParams = {
    ...params,
    page: params.page ?? 1,
    limit: params.limit ?? DEFAULT_PRODUCT_LIMIT,
  };

  const query = withDefaults.q?.trim();
  const isSearch = Boolean(query);

  return useQuery({
    queryKey: isSearch
      ? queryKeys.productSearch(withDefaults)
      : queryKeys.productList(withDefaults),
    queryFn: ({ signal }) =>
      isSearch
        ? searchProducts({ ...withDefaults, q: query as string }, signal)
        : listProducts(withDefaults, signal),
    // Keeps the previous page's rows on screen while the next page loads, so paging does not
    // blank the grid and shift the scroll position.
    placeholderData: (previous) => previous,
  });
}

export function useProduct(slugOrId: string) {
  return useQuery({
    queryKey: queryKeys.product(slugOrId),
    queryFn: ({ signal }) => getProduct(slugOrId, signal),
    enabled: Boolean(slugOrId),
    staleTime: 2 * 60_000,
  });
}

export function useProductReviews(slugOrId: string, page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.productReviews(slugOrId, page),
    queryFn: ({ signal }) => getProductReviews(slugOrId, { page }, signal),
    // `enabled` lets the PDP defer this until the Reviews tab is actually opened, rather than
    // fetching a list most visitors never look at.
    enabled: enabled && Boolean(slugOrId),
    placeholderData: (previous) => previous,
  });
}

export function useRelatedProducts(slugOrId: string, limit = 8) {
  return useQuery({
    queryKey: queryKeys.productRelated(slugOrId),
    queryFn: ({ signal }) => getRelatedProducts(slugOrId, limit, signal),
    enabled: Boolean(slugOrId),
    staleTime: 5 * 60_000,
  });
}

/** Resolves product ids to summaries. Disabled on an empty list so no request is made. */
export function useProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.productsByIds(ids),
    queryFn: ({ signal }) => getProductsByIds(ids, signal),
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });
}

export function useLabReports(page = 1) {
  return useQuery({
    queryKey: queryKeys.labReports(page),
    queryFn: ({ signal }) => getLabReports({ page }, signal),
    placeholderData: (previous) => previous,
  });
}
