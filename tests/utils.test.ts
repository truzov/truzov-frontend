import { describe, expect, it } from 'vitest';
import {
  activeFilterEntries,
  filtersToSearchParams,
  parseFilters,
  toProductListParams,
} from '@/lib/utils/filters';
import { isValidRedirect } from '@/lib/auth/redirect';
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

  it('serialises filter state back into a query string preserving multiple fields at once', () => {
    // The bug this replaces: `<Link href="/products?category=honey">`-style controls were
    // absolute and wiped every other filter; relative `<Link href="?sort=price_asc">` controls
    // replaced the whole query string in Next.js. Composing filters must not lose siblings.
    const search = filtersToSearchParams({
      category: 'honey',
      labVerified: true,
      sort: 'price_asc',
    });

    expect(search.get('category')).toBe('honey');
    expect(search.get('labVerified')).toBe('true');
    expect(search.get('sort')).toBe('price_asc');
  });

  it('omits the default sort and unset fields from the serialised query', () => {
    const search = filtersToSearchParams({ sort: 'relevance' });

    expect(search.toString()).toBe('');
  });

  it('excludes q from the serialised query even when present on the filter state', () => {
    // The filter sheet does not edit search text; carrying `q` through here would let a
    // category click on /search silently start dropping the in-flight query. Callers that need
    // to keep `q` reattach it themselves after calling this.
    const search = filtersToSearchParams({ category: 'honey', query: 'ghee' });

    expect(search.has('q')).toBe(false);
    expect(search.get('category')).toBe('honey');
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


/**
 * The gate every post-login navigation goes through: `AuthModal.handleSuccess`,
 * `LoginForm.resolveRedirect` (which also re-encodes the value into `/verify-otp?redirect=…`),
 * and `AuthModalRedirect`. A curated adversarial table, not random strings — the interesting
 * inputs here are few and known.
 *
 * Validates: Requirements 5.7, 5.8
 */
describe('post-login redirect gate', () => {
  it('rejects anything that can leave the origin', () => {
    for (const target of [
      '//evil.com',
      '/\\evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      'http://localhost:3000/x',
      '\\\\evil.com',
      '',
      null,
      undefined,
    ]) {
      expect(isValidRedirect(target)).toBe(false);
    }
  });

  it('accepts same-origin relative application routes', () => {
    for (const target of ['/cart', '/checkout/address', '/account/orders?page=2']) {
      expect(isValidRedirect(target)).toBe(true);
    }
  });
});
