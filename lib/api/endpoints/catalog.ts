import { apiRequest } from '@/lib/api/client';
import type {
  BannerDto,
  CategoryDto,
  HomeDto,
  LabReportDto,
  PagedData,
  ProductDetailDto,
  ProductSummaryDto,
  ReviewDto,
  SearchSuggestionsDto,
} from '@/types/api';

/**
 * Public storefront endpoints. None of these require a bearer token, so none pass `auth: true`.
 *
 * Parameters here mirror the documented query contract exactly, including its units and
 * bounds. The rupee -> paise conversion for the price filter happens one layer up, in
 * lib/utils/filters.ts, where the UI's rupee values live.
 */

/** Server-side bounds, mirrored so the client cannot send a request that fails validation. */
export const PRODUCT_PAGE_LIMIT_MAX = 100;
export const PRODUCT_PAGE_MAX = 1000;
export const DEFAULT_PRODUCT_LIMIT = 24;

export type ProductSort =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'best_rated'
  | 'best_selling'
  | 'newest';

/** Mirrors the documented `GET /products` query parameters, names and units included. */
export interface ProductListParams {
  category?: string;
  brand?: string;
  sort?: ProductSort;
  /** PAISE, not rupees — the one place in the API where the unit differs from the DTOs. */
  minPrice?: number;
  maxPrice?: number;
  /** Any-of match. Max 20 tags. */
  tags?: string[];
  inStock?: boolean;
  labVerified?: boolean;
  /** Full-text query. Required by /search, optional on /products. */
  q?: string;
  page?: number;
  limit?: number;
}

export function getHome(signal?: AbortSignal): Promise<HomeDto> {
  return apiRequest<HomeDto>('/home', { signal });
}

export function getCategories(signal?: AbortSignal): Promise<CategoryDto[]> {
  return apiRequest<CategoryDto[]>('/categories', { signal });
}

export function getBanners(placement?: string, signal?: AbortSignal): Promise<BannerDto[]> {
  return apiRequest<BannerDto[]>('/banners', { query: { placement }, signal });
}

export function listProducts(
  params: ProductListParams = {},
  signal?: AbortSignal
): Promise<PagedData<ProductSummaryDto>> {
  return apiRequest<PagedData<ProductSummaryDto>>('/products', {
    query: toQuery(params),
    signal,
  });
}

/**
 * `/search` takes the same filters, sorting and pagination as `/products`, but `q` is
 * mandatory — omitting it is a 422 INVALID_REQUEST rather than an unfiltered list.
 */
export function searchProducts(
  params: ProductListParams & { q: string },
  signal?: AbortSignal
): Promise<PagedData<ProductSummaryDto>> {
  return apiRequest<PagedData<ProductSummaryDto>>('/search', {
    query: toQuery(params),
    signal,
  });
}

/** `slugOrId` accepts either, so a URL slug can be passed straight through. */
export function getProduct(slugOrId: string, signal?: AbortSignal): Promise<ProductDetailDto> {
  return apiRequest<ProductDetailDto>(`/products/${encodeURIComponent(slugOrId)}`, { signal });
}

export function getProductReviews(
  slugOrId: string,
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal
): Promise<PagedData<ReviewDto>> {
  return apiRequest<PagedData<ReviewDto>>(`/products/${encodeURIComponent(slugOrId)}/reviews`, {
    query: {
      page: clamp(params.page ?? 1, 1, PRODUCT_PAGE_MAX),
      limit: clamp(params.limit ?? DEFAULT_PRODUCT_LIMIT, 1, PRODUCT_PAGE_LIMIT_MAX),
    },
    signal,
  });
}

export function getRelatedProducts(
  slugOrId: string,
  limit = 8,
  signal?: AbortSignal
): Promise<ProductSummaryDto[]> {
  return apiRequest<ProductSummaryDto[]>(`/products/${encodeURIComponent(slugOrId)}/related`, {
    // Documented range is 1-24 for this endpoint specifically, not the usual 1-100.
    query: { limit: clamp(limit, 1, 24) },
    signal,
  });
}

/**
 * Resolves ids to summaries in one call. Used where a DTO references products by id only —
 * the lab reports list is the current case, and doing it per-report would be an N+1.
 */
export function getProductsByIds(
  ids: string[],
  signal?: AbortSignal
): Promise<ProductSummaryDto[]> {
  if (ids.length === 0) {
    // Skip the round trip entirely; an empty `ids` array has nothing to resolve.
    return Promise.resolve([]);
  }

  return apiRequest<ProductSummaryDto[]>('/products/batch', {
    method: 'POST',
    // Server caps this at 100. Slicing rather than erroring keeps a long page rendering with
    // the names it can resolve, which is better than failing the whole screen.
    body: { ids: ids.slice(0, 100) },
    signal,
  });
}

export function getSearchSuggestions(
  q: string,
  limit = 8,
  signal?: AbortSignal
): Promise<SearchSuggestionsDto> {
  return apiRequest<SearchSuggestionsDto>('/search/suggestions', {
    query: { q, limit: clamp(limit, 1, 20) },
    signal,
  });
}

export function getLabReports(
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal
): Promise<PagedData<LabReportDto>> {
  return apiRequest<PagedData<LabReportDto>>('/lab-reports', {
    query: {
      page: clamp(params.page ?? 1, 1, PRODUCT_PAGE_MAX),
      // The service default is 20 and the server bounds it; we only enforce a sane floor.
      limit: params.limit === undefined ? undefined : clamp(params.limit, 1, PRODUCT_PAGE_LIMIT_MAX),
    },
    signal,
  });
}

/**
 * Clamps page/limit and caps `tags` before the request leaves the browser.
 *
 * The point is not defensiveness for its own sake: an out-of-range `limit` comes back as a
 * VALIDATION_ERROR, and a validation error rendered on a product grid reads to the user as
 * "the shop is broken". Clamping turns a paging bug into a slightly-wrong page size.
 */
function toQuery(params: ProductListParams): Record<string, string | number | boolean | string[] | undefined> {
  return {
    category: params.category,
    brand: params.brand,
    sort: params.sort,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    // Documented maximum is 20 tags.
    tags: params.tags?.slice(0, 20),
    inStock: params.inStock,
    labVerified: params.labVerified,
    q: params.q,
    page: params.page === undefined ? undefined : clamp(params.page, 1, PRODUCT_PAGE_MAX),
    limit:
      params.limit === undefined
        ? undefined
        : clamp(params.limit, 1, PRODUCT_PAGE_LIMIT_MAX),
  };
}

function clamp(value: number, min: number, max: number): number {
  // Number.isFinite guards against NaN reaching the URL, which happens whenever a hand-edited
  // query string like ?page=abc is passed through Number().
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}
