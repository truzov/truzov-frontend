import { describe, expect, it } from 'vitest';
import { products } from '@/lib/data/fixtures';
import { calculateCartTotals, calculateDiscount } from '@/lib/utils/money';
import { filterProducts, parseFilters } from '@/lib/utils/filters';
import { nextVerificationStatus } from '@/lib/utils/verification';

describe('commerce utilities', () => {
  it('calculates discounts and cart totals', () => {
    expect(calculateDiscount(499, 699)).toBe(29);
    expect(
      calculateCartTotals([{ product: products[0], quantity: 2, unitPrice: products[0].price }], 'TRUZOV10')
    ).toMatchObject({ subtotal: 998, discount: 100, shipping: 0, total: 898 });
  });

  it('parses filters and filters products', () => {
    const params = new URLSearchParams('category=honey&labVerified=true&sort=price_asc');
    const filters = parseFilters(params);
    expect(filters.category).toBe('honey');
    expect(filterProducts(products, filters).every((product) => product.category === 'honey')).toBe(true);
  });

  it('advances verification status', () => {
    expect(nextVerificationStatus('submitted')).toBe('samples_collected');
    expect(nextVerificationStatus('approved')).toBe('rejected');
  });
});
