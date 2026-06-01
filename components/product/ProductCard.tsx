'use client';

import { Heart, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { useCartStore } from '@/store/cart.store';
import { useUiStore } from '@/store/ui.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { formatCurrency } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';

export function ProductCard({
  product,
  variant = 'default',
  priority,
}: {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  priority?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const wished = useWishlistStore((state) => state.ids.includes(product.id));
  const addToast = useUiStore((state) => state.addToast);

  const addToCart = () => {
    addItem(product, 1);
    addToast({
      type: 'success',
      title: 'Added to cart',
      message: product.name,
      actionLabel: 'View cart',
      actionHref: '/cart',
    });
  };

  const compact = variant === 'compact';

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-md border border-surface-border bg-surface-base shadow-xs transition hover:shadow-sm',
        compact && 'min-w-[180px]'
      )}
    >
      <div className={cn('relative bg-surface-raised', variant === 'featured' ? 'aspect-[4/3]' : 'aspect-square')}>
        <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
          <Image
            alt={product.images[0].alt}
            className={cn('object-cover transition-transform duration-200 group-hover:scale-[1.03]', !product.inStock && 'grayscale')}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            src={product.images[0].url}
          />
        </Link>
        <div className="absolute left-2 top-2 flex max-w-[80%] flex-wrap gap-1">
          {product.isLabVerified ? <Badge variant="success">Lab Verified</Badge> : null}
          {product.isBestseller && !compact ? <Badge variant="bestseller">Bestseller</Badge> : null}
          {product.isNewArrival && !compact ? <Badge variant="new">New</Badge> : null}
        </div>
        <Button
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-2 top-2 rounded-full bg-surface-base/90"
          size="icon"
          variant="ghost"
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart
            aria-hidden="true"
            className={cn('h-4 w-4', wished ? 'fill-brand-accent text-brand-accent' : 'text-text-secondary')}
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
        {variant === 'featured' ? (
          <p className="line-clamp-1 text-sm text-text-secondary">{product.benefits[0]}</p>
        ) : null}
        {!compact && product.reviewCount > 0 ? <Rating count={product.reviewCount} rating={product.rating} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-brand-primary">{formatCurrency(product.price)}</span>
          {!compact ? (
            <>
              <span className="text-sm text-text-muted line-through">{formatCurrency(product.mrp)}</span>
              <span className="text-xs font-semibold text-brand-accent">{product.discount}% off</span>
            </>
          ) : null}
        </div>
        {compact ? (
          <Button aria-label={`Add ${product.name}`} size="sm" variant="outline" onClick={addToCart}>
            <ShoppingCart aria-hidden="true" className="h-4 w-4" />
            Add
          </Button>
        ) : (
          <Button disabled={!product.inStock} size="sm" variant={product.inStock ? 'outline' : 'secondary'} onClick={addToCart}>
            {product.inStock ? 'Add to Cart' : 'Notify Me'}
          </Button>
        )}
      </div>
    </article>
  );
}
