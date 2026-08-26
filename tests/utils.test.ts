import { describe, expect, it } from 'vitest';
import {
  activeFilterEntries,
  parseFilters,
  toProductListParams,
} from '@/lib/utils/filters';
import { calculateDiscount, formatCurrency } from '@/lib/utils/money';
import { displayImages, humaniseSlug } from '@/lib/utils/product';

/**
 * These replace the previous assertions against `calculateCartTotals` and `filterProducts`, both of
 * which were deleted: totals are the server's, and filtering happens server-side.
 */

describe('filter URL <-> API query adapter', () => {
  it('parses the URL into UI filter state', () => {
    const filters = parseFilters(
      new URLSearchParams('category=honey&labVerified=true&sort=price_asc&minPrice=100')
    );

    expect(filters.category).toBe('honey');
    expect(filters.labVerified).toBe(true);
    expect(filters.sort).toBe('price_asc');
    expect(filters.minPrice).toBe(100);
  });

  it('omits narrowing switches when they are absent or false', () => {
    // `inStock=false` would ask the server for out-of-stock items ONLY, so anything other than
    // an explicit "true" must become undefined rather than false.
    expect(parseFilters(new URLSearchParams('')).inStock).toBeUndefined();
    expect(parseFilters(new URLSearchParams('inStock=false')).inStock).toBeUndefined();
    expect(parseFilters(new URLSearchParams('inStock=true')).inStock).toBe(true);
  });

  it('ignores a non-numeric price so NaN never reaches the query string', () => {
    expect(parseFilters(new URLSearchParams('minPrice=abc')).minPrice).toBeUndefined();
  });

  it('converts rupee price filters to paise', () => {
    // The one unit mismatch in the whole API: product DTO prices are integer rupees, but the
    // minPrice/maxPrice QUERY PARAMETERS are paise. Getting this wrong does not error - it filters
    // by a hundredth of the intended amount and quietly returns nothing.
    const params = toProductListParams({ minPrice: 100, maxPrice: 500 });

    expect(params.minPrice).toBe(10_000);
    expect(params.maxPrice).toBe(50_000);
  });

  it('maps the UI query field onto the API q field and trims it', () => {
    expect(toProductListParams({ query: '  honey  ' }).q).toBe('honey');
    // An all-whitespace query must not be sent: /search rejects a missing q with 422, and sending
    // a blank one is not a meaningful search either.
    expect(toProductListParams({ query: '   ' }).q).toBeUndefined();
  });

  it('drops an unrecognised sort rather than forwarding it to a 400', () => {
    expect(toProductListParams({ sort: 'price_asc' }).sort).toBe('price_asc');
    expect(toProductListParams({ sort: 'cheapest-first' }).sort).toBeUndefined();
  });

  it('lets an explicit page override the URL page', () => {
    expect(toProductListParams({ page: 3 }, { page: 1 }).page).toBe(1);
  });

  it('lists active filters for the chips, excluding paging', () => {
    const entries = activeFilterEntries({ category: 'honey', labVerified: true, page: 4 });

    expect(entries).toEqual([
      ['category', 'honey'],
      ['lab verified', 'yes'],
    ]);
  });
});

describe('money', () => {
  it('formats integer rupees', () => {
    // Non-breaking space in the Intl output, so compare on the digits rather than the whole string.
    expect(formatCurrency(449)).toContain('449');
    expect(formatCurrency(449)).toContain('₹');
  });

  it('calculates a percentage discount and refuses nonsense inputs', () => {
    expect(calculateDiscount(449, 599)).toBe(25);
    expect(calculateDiscount(599, 599)).toBe(0);
    expect(calculateDiscount(700, 599)).toBe(0);
    expect(calculateDiscount(449, 0)).toBe(0);
  });
});

describe('product display helpers', () => {
  it('accepts both object and bare-string image shapes', () => {
    expect(displayImages([{ url: 'a.png', alt: 'Jar' }], 'Honey')).toEqual([
      { url: 'a.png', alt: 'Jar' },
    ]);
    expect(displayImages(['a.png'], 'Honey')).toEqual([{ url: 'a.png', alt: 'Honey' }]);
  });

  it('falls back to the product name when alt text is missing', () => {
    // Alt text is an accessibility requirement, so it must not depend on an optional field.
    expect(displayImages([{ url: 'a.png' }], 'Raw Forest Honey')[0].alt).toBe('Raw Forest Honey');
    expect(displayImages([{ url: 'a.png', alt: '   ' }], 'Raw Forest Honey')[0].alt).toBe(
      'Raw Forest Honey'
    );
  });

  it('drops entries with no usable url', () => {
    expect(displayImages([{ url: '' }, { url: 'b.png' }], 'Honey')).toEqual([
      { url: 'b.png', alt: 'Honey' },
    ]);
    expect(displayImages(undefined, 'Honey')).toEqual([]);
  });

  it('humanises a category slug', () => {
    expect(humaniseSlug('cold-pressed-oils')).toBe('Cold Pressed Oils');
  });
});
