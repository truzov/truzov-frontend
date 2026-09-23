// Property-test generator decision (task 1.1): Option A — fast-check, pinned exact in
// devDependencies; properties use fc.assert(fc.property(...), { numRuns: 100 }).

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { effectivePrice, formatCurrency } from '@/lib/utils/money';
import { defaultVariantId } from '@/lib/utils/product';
import type { ProductDetailDto, ProductSummaryDto, ProductVariantDto } from '@/types/api';

/**
 * Generators and product builders live at module scope and are exported so tasks 3.7 and 3.9 can
 * reuse them for the rendered assertions without restructuring this file.
 */

/**
 * `priceModifier` is optional and signed on the wire (seed values -200, 0, +700), so the
 * generator reaches all four shapes the display code must survive: absent, zero, negative, large.
 */
export const priceModifierArb: fc.Arbitrary<number | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(0),
  fc.integer({ min: -5_000, max: -1 }),
  fc.integer({ min: 1, max: 100_000 }),
);

/**
 * `inStock` is optional: `false` means unavailable, and an **absent** flag means available (see
 * `defaultVariantId`). All three values are generated so "selectable" is exercised, not assumed.
 */
export const inStockArb: fc.Arbitrary<boolean | undefined> = fc.constantFrom(
  true,
  false,
  undefined,
);

export function buildVariant(index: number, over: Partial<ProductVariantDto> = {}): ProductVariantDto {
  return {
    id: `variant-${index}`,
    label: 'Size',
    value: `${(index + 1) * 250} ML`,
    ...over,
  };
}

/** Ids are index-derived so a generated list never carries a duplicate id. */
export const variantListArb: fc.Arbitrary<ProductVariantDto[]> = fc.oneof(
  // The empty list — a Simple_Product, no variant ever selected.
  fc.constant<ProductVariantDto[]>([]),
  fc
    .array(fc.record({ priceModifier: priceModifierArb, inStock: inStockArb }), {
      minLength: 1,
      maxLength: 6,
    })
    .map((entries) => entries.map((over, index) => buildVariant(index, over))),
  // Every variant out of stock: nothing is selectable, so the displayed price must fall back to
  // the base price rather than to an arbitrary variant's modifier.
  fc
    .array(fc.record({ priceModifier: priceModifierArb }), { minLength: 1, maxLength: 4 })
    .map((entries) =>
      entries.map((over, index) => buildVariant(index, { ...over, inStock: false })),
    ),
);

/** Integer rupees on the wire; 0 is included because a free/sample product is valid data. */
export const basePriceArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 1_000_000 });

export function buildProduct(
  price: number,
  variants: ProductVariantDto[],
  over: Partial<ProductDetailDto> = {},
): ProductDetailDto {
  return {
    id: 'product-1',
    slug: 'raw-forest-honey-500g',
    name: 'Raw Forest Honey',
    brand: 'Truzov',
    categorySlug: 'honey',
    price,
    mrp: price + 100,
    discount: 10,
    rating: 4.5,
    reviewCount: 12,
    inStock: true,
    isLabVerified: true,
    isBestseller: false,
    isOrganic: true,
    isFeatured: false,
    isNewArrival: false,
    tags: [],
    images: [],
    variants,
    stockCount: 20,
    verificationStatus: 'approved',
    benefits: [],
    ingredients: [],
    certifications: [],
    labMetrics: [],
    ...over,
  };
}

export const productArb: fc.Arbitrary<ProductDetailDto> = fc
  .tuple(basePriceArb, variantListArb)
  .map(([price, variants]) => buildProduct(price, variants));

/**
 * The two display call sites, mirroring exactly what tasks 3.6 and 3.7 introduce:
 * `ProductCard` resolves the selection out of an **optional** `variants` collection
 * (`ProductSummaryDto`), `ProductDetailScreen` out of a **required** one (`ProductDetailDto`).
 * Both then go through the one shared `effectivePrice` helper, which is the whole point of
 * putting it in `lib/utils/money.ts`.
 *
 * Render parity is asserted directly — by reading the price out of a mounted `ProductCard` and a
 * mounted `ProductDetailScreen` — once tasks 3.6 and 3.7 land and those components consume
 * `effectivePrice`. Until then neither component reads it, so rendering them here would assert
 * nothing about this property. The generators above are what those assertions will reuse.
 */
export function cardDisplayedPrice(product: ProductSummaryDto, selectedVariantId?: string): number {
  const selected = product.variants?.find((variant) => variant.id === selectedVariantId);
  return effectivePrice(product.price, selected);
}

export function detailDisplayedPrice(
  product: ProductDetailDto,
  selectedVariantId?: string,
): number {
  const selected = product.variants.find((variant) => variant.id === selectedVariantId);
  return effectivePrice(product.price, selected);
}

const selectable = (variant: ProductVariantDto) => variant.inStock !== false;

describe('effective price', () => {
  // Feature: auth-toast-buy-now-variant-selection, Property 4: Effective_Price is the base price
  // plus the selected modifier, everywhere — for any base price and any variant list, for every
  // selectable variant the displayed price equals price + (variant.priceModifier ?? 0), and the
  // value displayed by the Product_Card equals the value displayed by the Product_Detail_Page for
  // the same product and variant.
  // Validates: Requirements 3.6, 3.7, 5.1
  it('is base price plus the selected modifier, and identical on the card and the detail page', () => {
    fc.assert(
      fc.property(productArb, (product) => {
        for (const variant of product.variants.filter(selectable)) {
          const expected = product.price + (variant.priceModifier ?? 0);

          expect(detailDisplayedPrice(product, variant.id)).toBe(expected);
          // Same product and variant, the card's optional-collection lookup: same number, and the
          // same rendered string.
          expect(cardDisplayedPrice(product, variant.id)).toBe(expected);
          expect(formatCurrency(cardDisplayedPrice(product, variant.id))).toBe(
            formatCurrency(detailDisplayedPrice(product, variant.id)),
          );
        }

        // The preselected variant (R3.5) is a selectable variant, so it obeys the same rule; with
        // nothing selectable the displayed price is the untouched base price.
        const preselected = defaultVariantId(product.variants);
        const preselectedModifier =
          product.variants.find((variant) => variant.id === preselected)?.priceModifier ?? 0;

        expect(cardDisplayedPrice(product, preselected)).toBe(product.price + preselectedModifier);
        expect(cardDisplayedPrice(product, preselected)).toBe(
          detailDisplayedPrice(product, preselected),
        );

        if (preselected === undefined) {
          expect(cardDisplayedPrice(product, preselected)).toBe(product.price);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: auth-toast-buy-now-variant-selection, Property 4 (security half): Effective_Price is a
  // pure display computation — no rounding, no discount recomputation, no total arithmetic.
  // Validates: Requirements 5.1
  it('is a pure display sum: no rounding, no discount recomputation, no total arithmetic', () => {
    fc.assert(
      fc.property(
        // Fractional values are not on the wire, but they are what catches a rounding step.
        fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1_000, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 1, max: 99 }),
        variantListArb,
        (price, modifier, quantity, variants) => {
          const variant = buildVariant(0, { priceModifier: modifier });
          const product = buildProduct(price, [variant, ...variants]);
          const snapshot = structuredClone(product);
          const displayed = detailDisplayedPrice(product, variant.id);

          // Exact float sum: a Math.round/toFixed step would break this.
          expect(displayed).toBe(price + modifier);

          // The server's discount is never recomputed and no total is derived here: the value does
          // not move when mrp, discount or stock change, and the helper takes no quantity at all,
          // so it cannot be a line total.
          const reprice = buildProduct(price, [variant, ...variants], {
            mrp: price * 3 + 1,
            discount: 73,
            stockCount: quantity,
          });
          expect(detailDisplayedPrice(reprice, variant.id)).toBe(displayed);
          expect(reprice.discount).toBe(73);
          expect(effectivePrice).toHaveLength(2);

          // Display-only means read-only: nothing about the product is mutated.
          expect(product).toEqual(snapshot);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------------------------
// Task 3.9 — unit tests for variant rendering and selection. One case each; Property 4 above
// already covers the input space, so these are examples/edge cases, not sweeps.
// ---------------------------------------------------------------------------------------------

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, beforeEach, afterEach } from 'vitest';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductDetailScreen } from '@/components/screens/ProductDetailScreen';

const addMock = vi.fn();
const buyNowMock = vi.fn();

vi.mock('@/hooks/api/useCart', () => ({
  useAddToCart: () => ({ add: addMock, addAsync: vi.fn(), isPending: false }),
  useBuyNow: () => ({ buyNow: buyNowMock, checkout: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/api/useWishlist', () => ({
  useIsWishlisted: () => false,
  useToggleWishlist: () => ({ toggle: vi.fn(), isPending: false }),
}));

const useProductMock = vi.fn();
vi.mock('@/hooks/api/useCatalog', () => ({
  useProduct: (slug: string) => useProductMock(slug),
  useCategories: () => ({ data: [] }),
  useProductReviews: () => ({ data: undefined, isLoading: false, isError: false }),
  useRelatedProducts: () => ({ data: undefined }),
}));

/** Renders `ProductDetailScreen` with `useProduct` stubbed to return `product` immediately. */
function renderDetail(product: ReturnType<typeof buildProduct>) {
  useProductMock.mockReturnValue({
    data: product,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductDetailScreen slug={product.slug} />
    </QueryClientProvider>,
  );
}

/** Renders a `ProductCard` from a `ProductSummaryDto`-shaped product (no `useProduct` needed). */
function renderCard(product: ReturnType<typeof buildProduct>) {
  return render(<ProductCard product={product} />);
}

const twoVariants: ProductVariantDto[] = [
  buildVariant(0, { label: 'Size', value: '250 ML', priceModifier: 0 }),
  buildVariant(1, { label: 'Size', value: '500 ML', priceModifier: 200 }),
];

describe('variant rendering and selection (task 3.9)', () => {
  beforeEach(() => {
    addMock.mockClear();
    buyNowMock.mockClear();
    useProductMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** The card's variant control is a native <select> dropdown (VariantSelect). */
  const cardSelect = () => screen.getByRole('combobox', { name: /select size/i }) as HTMLSelectElement;

  // 3.1
  it('renders the selector on both the card and the detail page for a 2-variant product', () => {
    const product = buildProduct(500, twoVariants);

    const { unmount } = renderCard(product);
    // The card now presents the selector as a dropdown (VariantSelect).
    expect(screen.getByRole('combobox', { name: /select size/i })).toBeInTheDocument();
    unmount();

    renderDetail(product);
    // The detail page still presents the selector as a pill group (VariantPills).
    expect(screen.getByRole('group', { name: /select size/i })).toBeInTheDocument();
  });

  // 3.2
  it("labels the dropdown with the selected variant's label", () => {
    const product = buildProduct(500, twoVariants);
    renderCard(product);

    expect(screen.getByRole('combobox', { name: 'Select Size' })).toBeInTheDocument();
  });

  // 3.3
  it('renders options in backend-returned array order', () => {
    const product = buildProduct(500, twoVariants);
    renderCard(product);

    const options = within(cardSelect()).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['250 ML', '500 ML']);
  });

  // 3.4
  it('preselects the default variant as the dropdown value', () => {
    const product = buildProduct(500, twoVariants);
    renderCard(product);

    // Both variants are in stock, so the default is the first entry.
    expect(cardSelect().value).toBe('variant-0');
  });

  // 3.5
  it('preselects the first in-stock variant when the first entry is out of stock', () => {
    const variants: ProductVariantDto[] = [
      buildVariant(0, { value: '250 ML', inStock: false }),
      buildVariant(1, { value: '500 ML', inStock: true }),
    ];
    const product = buildProduct(500, variants);
    renderCard(product);

    expect(cardSelect().value).toBe('variant-1');

    const option250 = within(cardSelect())
      .getAllByRole('option')
      .find((option) => option.textContent?.startsWith('250 ML'));
    expect(option250).toBeDisabled();
  });

  // 3.7 + 4.4
  it('carries the selected variantId in the add-to-cart body, and omits it for a simple product', async () => {
    const user = userEvent.setup();
    const product = buildProduct(500, twoVariants);
    const { unmount } = renderCard(product);

    await user.selectOptions(cardSelect(), 'variant-1');
    await user.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock.mock.calls[0][0]).toMatchObject({ variantId: 'variant-1' });
    unmount();

    addMock.mockClear();
    const simple = buildProduct(500, []);
    render(<ProductCard product={simple} />);
    await user.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock.mock.calls[0][0].variantId).toBeUndefined();
  });

  // 3.8 + 3.9
  it('renders an out-of-stock option disabled and unavailable, and the dropdown value stays on the in-stock variant', () => {
    const variants: ProductVariantDto[] = [
      buildVariant(0, { value: '250 ML', inStock: true }),
      buildVariant(1, { value: '500 ML', inStock: false }),
    ];
    const product = buildProduct(500, variants);
    renderCard(product);

    const outOfStockOption = within(cardSelect())
      .getAllByRole('option')
      .find((option) => option.textContent?.startsWith('500 ML'));
    expect(outOfStockOption).toBeDisabled();
    expect(outOfStockOption?.textContent).toContain('unavailable');

    // A disabled option cannot be selected, so the value remains the in-stock variant.
    expect(cardSelect().value).toBe('variant-0');
  });

  // 3.10
  it('disables Add to Cart when every variant is out of stock', () => {
    const variants: ProductVariantDto[] = [
      buildVariant(0, { value: '250 ML', inStock: false }),
      buildVariant(1, { value: '500 ML', inStock: false }),
    ];
    const product = buildProduct(500, variants);
    renderCard(product);

    expect(screen.getByRole('button', { name: 'Out of Stock' })).toBeDisabled();
  });

  // 3.11
  it('the detail page still uses pill buttons with aria-pressed', () => {
    const product = buildProduct(500, twoVariants);
    renderDetail(product);

    const buttons = within(screen.getByRole('group', { name: /select size/i })).getAllByRole(
      'button',
    );
    // Every pill exposes an aria-pressed state, and exactly one is pressed.
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-pressed');
    }
    const pressed = buttons.filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
  });

  // 3.13
  it('selects a pill via Tab then Enter on the detail page, and exposes an accessible name on the group', async () => {
    const user = userEvent.setup();
    const product = buildProduct(500, twoVariants);
    renderDetail(product);

    const group = screen.getByRole('group', { name: /select size/i });
    expect(group).toHaveAccessibleName();

    const firstPill = within(group).getByRole('button', { name: '250 ML' });
    const secondPill = within(group).getByRole('button', { name: '500 ML' });
    firstPill.focus();
    await user.tab();
    expect(secondPill).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(secondPill).toHaveAttribute('aria-pressed', 'true');
  });

  // 4.1 + 6.2
  it('renders a simple card when variants are absent, empty, or a single entry', () => {
    const absent = buildProduct(500, undefined as unknown as ProductVariantDto[]);
    delete (absent as { variants?: ProductVariantDto[] }).variants;
    const { unmount: unmountAbsent } = renderCard(absent);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    unmountAbsent();

    const empty = buildProduct(500, []);
    const { unmount: unmountEmpty } = renderCard(empty);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    unmountEmpty();

    const single = buildProduct(500, [buildVariant(0)]);
    render(<ProductCard product={single} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  // 6.1
  it('renders the selector from a 2-variant listing summary with zero fetch calls', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const product = buildProduct(500, twoVariants);
    renderCard(product);

    expect(screen.getByRole('combobox', { name: /select size/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
