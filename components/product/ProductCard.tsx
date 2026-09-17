'use client';

import { Heart, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { VariantSelect } from '@/components/product/VariantSelect';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { useAddToCart } from '@/hooks/api/useCart';
import { useIsWishlisted, useToggleWishlist } from '@/hooks/api/useWishlist';
import { cn } from '@/lib/utils/cn';
import { effectivePrice, formatCurrency } from '@/lib/utils/money';
import { defaultVariantId, primaryImage } from '@/lib/utils/product';
import type { ProductSummaryDto } from '@/types/api';

/**
 * Product tile, driven by `ProductSummaryDto`.
 *
 * Notes worth knowing before editing:
 *
 * 1. The `featured` variant used to print `product.benefits[0]`. `benefits` exists only on
 *    ProductDetailDto, never on a summary, so that line is gone rather than faked — a listing
 *    page has no way to obtain it without an extra request per card.
 * 2. `discount` comes from the server. It is not recomputed from price/mrp here, so the
 *    percentage on a card always matches the percentage the server would apply.
 * 3. `variants` is optional on a summary. A card renders the size dropdown only with 2 or more
 *    entries and otherwise stays a simple-product card — no request is ever issued per card to
 *    obtain them, so an absent or single-entry list is a normal state, not an error.
 * 4. The card has a single CTA: Add to Cart. Buy Now lives on the product detail page only, so
 *    the listing grid stays a scan-and-add surface. The button block is pinned to the bottom
 *    with `mt-auto`, so a card with a dropdown and a card without one align their buttons.
 */
export function ProductCard({
  product,
  variant = 'default',
  priority,
}: {
  product: ProductSummaryDto;
  variant?: 'default' | 'compact' | 'featured';
  priority?: boolean;
}) {
  const { add, isPending } = useAddToCart();
  const toggleWishlist = useToggleWishlist(`/products/${product.slug}`);
  const wished = useIsWishlisted(product.id);

  const image = primaryImage(product);
  const compact = variant === 'compact';

  /**
   * The card only offers a choice when the listing response actually carries one. Fewer than two
   * entries means there is nothing to choose between, so the card stays a simple-product card and
   * variant selection is deferred to the detail page. Collapsing that to a single `undefined`
   * local is what makes the price, the saving guard and the add-to-cart `variantId` below all
   * fall out correctly with no further branching.
   */
  const variants = (product.variants?.length ?? 0) >= 2 ? product.variants : undefined;
  // Derived, not stored: no reset effect is needed when the product changes, and there is no
  // toggle-off state that could leave a variant product with nothing selected.
  const [chosenVariantId, setChosenVariantId] = useState<string>();
  const selectedVariantId = chosenVariantId ?? defaultVariantId(variants);
  const selectedVariant = variants?.find((entry) => entry.id === selectedVariantId);

  // Display only. Never sent in a request, and it never replaces a server-supplied total.
  const displayPrice = effectivePrice(product.price, selectedVariant);
  /**
   * `mrp` is not variant-adjusted, so with a +₹700 variant selected the server's `mrp`/`discount`
   * pair would render as a bogus saving against a price it was never computed for. Hidden in that
   * case rather than recomputed — `discount` stays the server's number.
   */
  const hasSaving = (selectedVariant?.priceModifier ?? 0) === 0 && product.mrp > product.price;
  // A variant product whose every variant is out of stock has nothing selectable, which is the
  // same dead end as a product that is out of stock — and gets the same "Out of Stock" label.
  const purchasable = product.inStock && (!variants || selectedVariantId !== undefined);

  const addToCart = () => {
    // Guests add to the local bag (the hook handles both cases); the snapshot fields let the
    // guest bag render, and the login-time merge re-prices everything server-side.
    add({
      productId: product.id,
      productName: product.name,
      // Absent for a simple product, so the server treats it as the base product.
      variantId: selectedVariantId,
      slug: product.slug,
      imageUrl: image?.url,
      unitPrice: product.price,
    });
  };

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-md border border-surface-border bg-surface-base shadow-xs transition hover:shadow-sm',
        compact && 'min-w-[180px]'
      )}
    >
      <div
        className={cn('bg-surface-raised', variant === 'featured' ? 'aspect-[4/3]' : 'aspect-square')}
        style={{ position: 'relative' }}
      >
        <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
          {image ? (
            <Image
              alt={image.alt}
              className={cn(
                'object-cover transition-transform duration-200 group-hover:scale-[1.03]',
                !product.inStock && 'grayscale'
              )}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              src={image.url}
            />
          ) : (
            // A product with no images is valid data, so this is a layout placeholder rather
            // than an error state. Deliberately not a remote placeholder URL — that would be
            // another host to allow-list in next.config.ts.
            <span className="grid h-full w-full place-items-center text-xs text-text-muted">
              No image
            </span>
          )}
        </Link>
        <div className="absolute left-2 top-2 flex max-w-[80%] flex-wrap gap-1">
          {product.isLabVerified ? <Badge variant="success">Lab Verified</Badge> : null}
          {product.isBestseller && !compact ? <Badge variant="bestseller">Bestseller</Badge> : null}
          {product.isNewArrival && !compact ? <Badge variant="new">New</Badge> : null}
        </div>
        <Button
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-2 top-2 rounded-full bg-surface-base/90"
          disabled={toggleWishlist.isPending}
          size="icon"
          variant="ghost"
          onClick={() => toggleWishlist.toggle(product.id)}
        >
          <Heart
            aria-hidden="true"
            className={cn(
              'h-4 w-4',
              wished ? 'fill-brand-accent text-brand-accent' : 'text-text-secondary'
            )}
          />
        </Button>
      </div>
      <div className={cn('flex flex-1 flex-col gap-2 p-3', compact && 'p-2')}>
        {!compact ? (
          <p className="text-xs font-semibold uppercase text-text-muted">{product.brand}</p>
        ) : null}
        <Link
          className={cn(
            'font-semibold leading-snug text-text-primary hover:text-brand-primary',
            compact ? 'line-clamp-1 text-sm' : 'line-clamp-2 min-h-[42px] text-base'
          )}
          href={`/products/${product.slug}`}
        >
          {product.name}
        </Link>
        {!compact && product.reviewCount > 0 ? (
          <Rating count={product.reviewCount} rating={product.rating} />
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-brand-primary">{formatCurrency(displayPrice)}</span>
          {!compact ? (
            <>
              {/* Only show a struck-through MRP when there is a real saving; seeded products
                  can have mrp === price, and "₹449 ₹449 0% off" reads as a bug. */}
              {hasSaving ? (
                <>
                  <span className="text-sm text-text-muted line-through">
                    {formatCurrency(product.mrp)}
                  </span>
                  <span className="text-xs font-semibold text-brand-accent">
                    {product.discount}% off
                  </span>
                </>
              ) : null}
            </>
          ) : null}
        </div>
        {/* Size dropdown, only when the listing carries 2+ variants. Omitted entirely for a
            simple product — the CTA below is pinned with `mt-auto`, so simple and variant cards
            still align. */}
        {variants ? (
          <VariantSelect
            onSelect={setChosenVariantId}
            selectedId={selectedVariantId}
            variants={variants}
          />
        ) : null}
        <div className="mt-auto">
          {compact ? (
            <Button
              aria-label={`Add ${product.name}`}
              className="w-full"
              disabled={!purchasable || isPending}
              loading={isPending}
              size="sm"
              variant="outline"
              onClick={addToCart}
            >
              <ShoppingCart aria-hidden="true" className="h-4 w-4" />
              Add
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={!purchasable || isPending}
              loading={isPending}
              size="sm"
              variant={purchasable ? 'outline' : 'secondary'}
              onClick={addToCart}
            >
              {purchasable ? 'Add to Cart' : 'Out of Stock'}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}