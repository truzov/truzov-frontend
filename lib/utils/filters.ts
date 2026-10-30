import type { ProductListParams, ProductSort } from '@/lib/api/endpoints/catalog';

/**
 * Adapter between the URL the user sees and the query the API expects.
 *
 * `filterProducts` used to live here and sorted/filtered a fixture array in the browser. It is
 * gone: filtering, sorting and pagination are the server's job now, and a client-side pass over
 * one page of results would silently disagree with `total`.
 */

/**
 * Filter state as the UI thinks about it.
 *
 * Prices stay in integer rupees, matching the product database and API filters.
 * The text query is `query` here and `q` on the API.
 */
export interface ProductFilterState {
  category?: string;
  brand?: string;
  sort?: string;
  /** Integer rupees, matching the API/database price. */
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStock?: boolean;
  labVerified?: boolean;
  query?: string;
  page?: number;
}

const SORTS: readonly ProductSort[] = [
  'relevance',
  'price_asc',
  'price_desc',
  'best_rated',
  'best_selling',
  'newest',
];

export function parseFilters(params: URLSearchParams): ProductFilterState {
  return {
    category: params.get('category') ?? undefined,
    brand: params.get('brand') ?? undefined,
    sort: params.get('sort') ?? 'relevance',
    minPrice: parseNumber(params.get('minPrice')),
    maxPrice: parseNumber(params.get('maxPrice')),
    tags: params.get('tags')?.split(',').filter(Boolean),
    // Only `true` is meaningful: these are "narrow the results" switches, and sending
    // `inStock=false` would ask the server for out-of-stock items only.
    inStock: params.get('inStock') === 'true' ? true : undefined,
    labVerified: params.get('labVerified') === 'true' ? true : undefined,
    query: params.get('q') ?? undefined,
    page: parseNumber(params.get('page')),
  };
}

export function parseFilterRecord(params: Record<string, string | string[] | undefined>): ProductFilterState {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, Array.isArray(value) ? value.join(',') : value);
  }
  return parseFilters(search);
}

/**
 * UI filter state -> documented API query parameters.
 *
 * Prices are compared directly against the database's integer-rupee price column.
 * Multiplying by 100 here turns a ₹500 ceiling into ₹50,000 and returns wrong results.
 */
export function toProductListParams(
  filters: ProductFilterState,
  overrides?: { page?: number; limit?: number }
): ProductListParams {
  return {
    category: filters.category,
    brand: filters.brand,
    sort: normaliseSort(filters.sort),
    minPrice: priceInRupees(filters.minPrice),
    maxPrice: priceInRupees(filters.maxPrice),
    tags: filters.tags,
    inStock: filters.inStock,
    labVerified: filters.labVerified,
    q: filters.query?.trim() || undefined,
    page: overrides?.page ?? filters.page,
    limit: overrides?.limit,
  };
}

function priceInRupees(rupees: number | undefined): number | undefined {
  if (rupees === undefined || !Number.isFinite(rupees)) {
    return undefined;
  }

  return Math.round(rupees);
}

/** Drops an unrecognised `?sort=` rather than passing it through to a 400. */
function normaliseSort(sort: string | undefined): ProductSort | undefined {
  if (!sort) {
    return undefined;
  }

  return SORTS.includes(sort as ProductSort) ? (sort as ProductSort) : undefined;
}

function parseNumber(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  // A hand-edited `?minPrice=abc` becomes NaN; treat it as absent instead of forwarding it.
  return Number.isFinite(value) ? value : undefined;
}

/** Filter chips shown above the grid. Excludes paging, which is not a filter. */
export function activeFilterEntries(filters: ProductFilterState): Array<[string, string]> {
  const entries: Array<[string, string]> = [];

  if (filters.category) entries.push(['category', filters.category]);
  if (filters.brand) entries.push(['brand', filters.brand]);
  if (filters.minPrice !== undefined) entries.push(['min price', `₹${filters.minPrice}`]);
  if (filters.maxPrice !== undefined) entries.push(['max price', `₹${filters.maxPrice}`]);
  if (filters.inStock) entries.push(['in stock', 'yes']);
  if (filters.labVerified) entries.push(['lab verified', 'yes']);
  if (filters.tags?.length) entries.push(['tags', filters.tags.join(', ')]);

  return entries;
}

/**
 * Inverse of `parseFilters`: turns filter state back into a query string, preserving every
 * field `parseFilters` reads (not just the ones a given caller happens to set). Existing
 * `<Link href="?sort=...">`-style controls only ever wrote a single param and relied on Next.js
 * merging the rest in from the current URL for *relative* links — which breaks the moment two
 * controls need to compose (e.g. sort + category), because a relative href still replaces the
 * whole query string, not just the key it names. This serializer is the fix: build the full
 * query from filter state, not from one param at a time.
 *
 * `query` (the `q` param) is intentionally excluded — the filter sheet does not edit search
 * text, and carrying `q` through here would let a category click on `/search` silently start
 * dropping the in-flight query. Callers on `/search` should read `q` from the current URL
 * separately and append it themselves.
 */
export function filtersToSearchParams(filters: ProductFilterState): URLSearchParams {
  const search = new URLSearchParams();

  if (filters.category) search.set('category', filters.category);
  if (filters.brand) search.set('brand', filters.brand);
  if (filters.sort && filters.sort !== 'relevance') search.set('sort', filters.sort);
  if (filters.minPrice !== undefined) search.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) search.set('maxPrice', String(filters.maxPrice));
  if (filters.tags?.length) search.set('tags', filters.tags.join(','));
  if (filters.inStock) search.set('inStock', 'true');
  if (filters.labVerified) search.set('labVerified', 'true');

  return search;
}
