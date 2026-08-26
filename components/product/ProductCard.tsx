'use client';

import { Heart, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { useAddToCart } from '@/hooks/api/useCart';
import { useIsWishlisted, useToggleWishlist } from '@/hooks/api/useWishlist';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/money';
import { primaryImage } from '@/lib/utils/product';
import type { ProductSummaryDto } from '@/types/api';

/**
 * Product tile, driven by `ProductSummaryDto`.
 *
 * Two things changed with the API and are worth knowing before editing:
 *
 * 1. The `featured` variant used to print `product.benefits[0]`. `benefits` exists only on
 *    ProductDetailDto, never on a summary, so that line is gone rather than faked — a listing
 *    page has no way to obtain it without an extra request per card.
 * 2. `discount` comes from the server. It is not recomputed from price/mrp here, so the
 *    percentage on a card always matches the percentage the server would apply.
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
  const { add, isPending } = useAddToCart(`/products/${product.slug}`);
  const toggleWishlist = useToggleWishlist(`/products/${product.slug}`);
  const wished = useIsWishlisted(product.id);

  const image = primaryImage(product);
  const compact = variant === 'compact';

  const addToCart = () => {
    // Guests are sent to the auth modal by the hook — the cart endpoint is bearer-only, so
    // there is nothing sensible to do locally for a signed-out user.
    add({ productId: product.id, productName: product.name });
  };

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-md border border-surface-border bg-surface-base shadow-xs transition hover:shadow-sm',
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
      <div className={cn('grid gap-2 p-3', compact && 'p-2')}>
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
          <span className="font-semibold text-brand-primary">{formatCurrency(product.price)}</span>
          {!compact ? (
            <>
              {/* Only show a struck-through MRP when there is a real saving; seeded products
                  can have mrp === price, and "₹449 ₹449 0% off" reads as a bug. */}
              {product.mrp > product.price ? (
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
        {compact ? (
          <Button
            aria-label={`Add ${product.name}`}
            disabled={!product.inStock || isPending}
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
            disabled={!product.inStock || isPending}
            loading={isPending}
            size="sm"
            variant={product.inStock ? 'outline' : 'secondary'}
            onClick={addToCart}
          >
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        )}
      </div>
    </article>
  );
}
