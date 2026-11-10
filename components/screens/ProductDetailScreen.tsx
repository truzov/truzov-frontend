'use client';

import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  Heart,
  Info,
  Microscope,
  Share2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, InlineError } from '@/components/ui/ErrorState';
import { Rating } from '@/components/ui/Rating';
import { ProductDetailScreenSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductImageLightbox } from '@/components/product/ProductImageLightbox';
import { VariantPills } from '@/components/product/VariantPills';
import { QuantitySelector } from '@/components/product/QuantitySelector';
import { useCategories, useProduct, useProductReviews, useRelatedProducts } from '@/hooks/api/useCatalog';
import { useAddToCart, useBuyNow } from '@/hooks/api/useCart';
import { useIsWishlisted, useToggleWishlist } from '@/hooks/api/useWishlist';
import { useImageHover } from '@/hooks/useImageHover';
import { ERROR_CODES, isApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils/cn';
import { effectivePrice, formatCurrency } from '@/lib/utils/money';
import { defaultVariantId, displayImages, humaniseSlug } from '@/lib/utils/product';
import type { LabMetricStatus } from '@/types/api';

type Tab = 'Product Details' | 'Lab Report' | 'Reviews';

const TABS: Tab[] = ['Product Details', 'Lab Report', 'Reviews'];
const VIEWER_HISTORY_KEY = 'truzovProductImageViewer';

/**
 * Product detail page, driven by `GET /products/{slugOrId}`.
 *
 * This screen carried the most fixture-specific logic in the codebase, all of which is gone.
 * For anyone comparing against git history, the removed items were:
 *  - name, compare-at price and certifications branching on `product.id === 'prd-001'`
 *  - three hardcoded Unsplash images appended to EVERY product's gallery
 *  - a hardcoded "Heavy Metals / Pesticide Residue / Antibiotics — Not Detected" table and a
 *    permanently-green "Passed" pill, shown regardless of the product's real lab data
 *  - an unconditional "In stock. Ready to ship."
 *  - two hardcoded "similar products" with invented prices
 *  - a fabricated delivery date, free-delivery threshold, and seller rating
 *  - `batchId` / `sellerName`, which do not exist on any product DTO (plan §6.1)
 */
export function ProductDetailScreen({ slug }: { slug: string }) {
  const { data: product, isLoading, isError, error, refetch } = useProduct(slug);
  const { data: categories } = useCategories();

  const [tab, setTab] = useState<Tab>('Product Details');
  const [requestedQuantity, setQuantity] = useState(1);
  const submittedQuantity = useRef(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxProduct, setLightboxProduct] = useState<string | null>(null);
  const closingViewer = useRef(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const galleryHover = useImageHover();

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      closingViewer.current = false;
      setLightboxProduct(event.state?.[VIEWER_HISTORY_KEY] === slug ? slug : null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [slug]);
  // Only the user's explicit choice is stored; the effective selection is derived below, so
  // there is nothing to reset when the product changes and no toggle-off on a second click.
  const [chosenVariantId, setChosenVariantId] = useState<string>();

  const { buyNow, isPending: isBuyingNow } = useBuyNow();
  const { add, isPending: isAdding } = useAddToCart();
  const wishlist = useToggleWishlist(`/products/${slug}`);
  const isInWishlist = useIsWishlisted(product?.id ?? '');

  // Reviews are only fetched when the tab is opened. Most visitors never look, and this is a
  // separate paginated request — no reason to spend it on every page view.
  const reviewsQuery = useProductReviews(slug, 1, tab === 'Reviews');
  const relatedQuery = useRelatedProducts(slug);

  const gallery = useMemo(
    () => displayImages(product?.images, product?.name ?? 'Product'),
    [product?.images, product?.name]
  );

  if (isLoading) {
    return <ProductDetailScreenSkeleton />;
  }

  // A missing product is a normal outcome of a stale link, not a system failure, so it gets a
  // way forward rather than a retry button.
  if (isApiError(error) && error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          action="Browse Products"
          href="/products"
          icon={Info}
          message="This product is no longer available. It may have been removed or renamed."
          title="Product not found"
        />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          error={error}
          title="We could not load this product"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const imageIndex = Math.min(selectedImageIndex, Math.max(0, gallery.length - 1));
  const selectedImage = gallery[imageIndex];
  const openViewer = (trigger: HTMLButtonElement) => {
    trigger.focus({ preventScroll: true });
    closingViewer.current = false;
    if (window.history.state?.[VIEWER_HISTORY_KEY] !== slug) {
      window.history.pushState({ ...window.history.state, [VIEWER_HISTORY_KEY]: slug }, '');
    }
    setLightboxProduct(slug);
  };
  const closeViewer = () => {
    if (closingViewer.current) return;
    if (window.history.state?.[VIEWER_HISTORY_KEY] === slug) {
      closingViewer.current = true;
      window.history.back();
    } else {
      setLightboxProduct(null);
    }
  };
  const categoryName =
    categories?.find((category) => category.slug === product.categorySlug)?.name ??
    humaniseSlug(product.categorySlug);

  // Falls back to the first in-stock variant (R3.5), so Add to Cart is never blocked on a
  // product that has a selectable variant, and `undefined` when nothing is selectable.
  const selectedVariantId = product.variants?.some((variant) => variant.id === chosenVariantId)
    ? chosenVariantId : defaultVariantId(product.variants);
  const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId);
  /**
   * A variant product with nothing selectable cannot be added: there is no variant id to send.
   * The "Currently out of stock" line above already explains it.
   */
  const noSelectableVariant = Boolean(product.variants?.length) && (!selectedVariantId || !selectedVariant || selectedVariant.inStock === false || selectedVariant.stockCount === 0);
  /**
   * `mrp` and `discount` are not variant-adjusted server-side, so with a +₹700 variant selected
   * the server's pair would render as a bogus "25% off" against the adjusted price. The saving
   * block is therefore only shown while the modifier is zero. `discount` is still the server's
   * number and is never recomputed here.
   */
  const hasSaving = (selectedVariant?.priceModifier ?? 0) === 0 && product.mrp > product.price;
  // Stock ceiling for the quantity stepper. The server enforces its own per-line cap
  // (max-item-quantity) regardless; this only stops the obvious case locally.
  const availableStock = Math.min(product.stockCount, selectedVariant?.stockCount ?? product.stockCount);
  const maxQuantity = Math.max(1, Math.min(20, availableStock));
  const quantity = Math.min(requestedQuantity, maxQuantity);
  const unavailable = !product.inStock || noSelectableVariant || availableStock < 1;
  const purchasePending = isAdding || isBuyingNow;

  return (
    <div className="bg-background font-body text-on-surface">
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[5fr_4fr_3fr] lg:items-start">
          <section className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
            <div className="relative grid gap-2 md:pl-[68px]">
              <div className="relative order-1 aspect-square overflow-hidden rounded-xl border border-outline-variant bg-white">
                {selectedImage ? (
                  <button
                    {...galleryHover}
                    aria-label={`View full image: ${selectedImage.alt}`}
                    className="product-image-zoom relative block h-full w-full overflow-hidden [touch-action:pan-y_pinch-zoom]"
                    data-zoom="auto"
                    type="button"
                    onTouchStart={({ touches }) => {
                      const touch = touches[0];
                      touchStart.current = touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
                    }}
                    onTouchCancel={() => { touchStart.current = null; }}
                    onTouchEnd={(event) => {
                      const start = touchStart.current;
                      const end = event.changedTouches[0];
                      touchStart.current = null;
                      if (!start || !end || event.touches.length) return;
                      const dx = end.clientX - start.x;
                      const dy = end.clientY - start.y;
                      if (Math.abs(dx) > Math.max(40, Math.abs(dy))) {
                        if (event.cancelable) event.preventDefault();
                        setSelectedImageIndex(Math.min(gallery.length - 1, Math.max(0, imageIndex + (dx < 0 ? 1 : -1))));
                      } else if (Math.hypot(dx, dy) < 10) {
                        // Chromium may suppress the click from a tap immediately after a swipe.
                        if (event.cancelable) event.preventDefault();
                        openViewer(event.currentTarget);
                      }
                    }}
                    onClick={(event) => openViewer(event.currentTarget)}
                  >
                    <Image alt={selectedImage.alt} className="object-contain" fill priority sizes="(min-width: 1024px) 70vw, (min-width: 768px) 150vw, 100vw" src={selectedImage.url} />
                  </button>
                ) : <span className="grid h-full place-items-center text-sm">No image available</span>}
                <div className="absolute right-2 top-2 flex gap-2">
                  <Button aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'} className="rounded-full bg-white/95" disabled={wishlist.isPending} size="icon" variant="ghost" onClick={() => wishlist.toggle(product.id)}><Heart aria-hidden="true" size={20} className={isInWishlist ? 'fill-current' : ''} /></Button>
                  <Button aria-label="Share product" className="rounded-full bg-white/95" size="icon" variant="ghost" onClick={() => { const url = window.location.href; if (navigator.share) void navigator.share({ title: product.name, url }).catch(() => undefined); else void navigator.clipboard?.writeText(url).catch(() => undefined); }}><Share2 aria-hidden="true" size={20} /></Button>
                </div>
              </div>
              {gallery.length > 1 ? <div className="order-2 flex gap-2 overflow-x-auto md:absolute md:inset-y-0 md:left-0 md:w-[60px] md:flex-col md:overflow-y-auto">
                {(showAllImages ? gallery : gallery.slice(0, gallery.length > 5 ? 4 : 5)).map((image, index) => <button key={`${image.url}-${index}`} aria-label={`View image ${index + 1}`} aria-pressed={imageIndex === index} className={cn('relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg border bg-white', imageIndex === index ? 'border-2 border-primary' : 'border-outline-variant')} onClick={() => setSelectedImageIndex(index)} type="button"><Image alt={image.alt} className="object-contain" fill sizes="60px" src={image.url} /></button>)}
                {!showAllImages && gallery.length > 5 ? <button aria-label={`Show ${gallery.length - 4} more images`} className="h-[60px] w-[60px] shrink-0 rounded-lg border border-outline-variant bg-white font-semibold" onClick={() => setShowAllImages(true)} type="button">{gallery.length - 4}+</button> : null}
              </div> : null}
            </div>
          </section>
          <section className="order-2 grid gap-4 lg:col-start-2 lg:row-start-1">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <Link href="/products">Marketplace</Link>
              <ChevronRight aria-hidden="true" className="h-3 w-3" />
              <Link href={`/category/${product.categorySlug}`}>{categoryName}</Link>
              <ChevronRight aria-hidden="true" className="h-3 w-3" />
              <span className="font-medium text-primary">{product.name}</span>
            </nav>

            <div>
              <h1 className="font-body text-[clamp(28px,3vw,36px)] font-medium leading-tight text-on-surface">
                {product.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {product.reviewCount > 0 ? (
                  <>
                    <Rating count={product.reviewCount} rating={product.rating} />
                    <span className="text-sm text-on-surface-variant">
                      ({product.reviewCount.toLocaleString('en-IN')} Verified Reviews)
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-on-surface-variant">No reviews yet</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[28px] font-medium leading-none tabular-nums text-on-surface">
                {/* Indicative unit price for the selected variant, from the product's own
                    documented fields. Display only — the cart and order always show the
                    server's `unitPrice` / `lineTotal`. */}
                {formatCurrency(effectivePrice(product.price, selectedVariant))}
              </span>
              {/* Only shown when there is a genuine saving. Seeded and real products can have
                  mrp === price, and a struck-through identical price with "0% OFF" reads as a
                  rendering bug. `discount` is the server's number, never recomputed here. */}
              {hasSaving ? (
                <>
                  <span className="text-base text-on-surface-variant line-through">
                    {formatCurrency(product.mrp)}
                  </span>
                  <span className="rounded bg-error-container px-2 py-0.5 text-sm font-medium text-on-error-container">
                    {product.discount}% OFF
                  </span>
                </>
              ) : null}
            </div>

            {/* Driven by the product's real verification state. This panel used to claim
                "Independently tested for 99.8% purity, 100% pesticide-free" for every product
                on the site, including unverified ones. */}
            {product.isLabVerified ? (
              <div className="flex gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-on-primary">
                  <BadgeCheck aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                  <p className="flex items-center gap-1 font-semibold text-primary">
                    Lab Verified Authentic
                    <Info aria-hidden="true" className="h-4 w-4" />
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                    Independently tested by an accredited partner lab. See the Lab Report tab for
                    the measured values.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-container-highest text-on-surface-variant">
                  <Microscope aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-on-surface">Verification in progress</p>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                    This batch has not completed third-party lab verification yet. Current status:{' '}
                    {humaniseSlug(product.verificationStatus)}.
                  </p>
                </div>
              </div>
            )}


          </section>
          <aside className="order-3 grid gap-4 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-36">
            <div className="rounded-xl border border-outline-variant bg-white p-6 shadow-md">
              <p className="text-xl font-medium">
                {formatCurrency(effectivePrice(product.price, selectedVariant))}
              </p>
              {/* Real stock state. This block previously read "In stock. Ready to ship."
                  unconditionally, including for products with stockCount 0. */}
              {!unavailable ? (
                <p className="mt-2 flex items-center gap-1 text-sm font-medium text-text-success">
                  <span className="h-2 w-2 rounded-full bg-text-success" />
                  In stock
                  {availableStock <= 10
                    ? ` — only ${availableStock} left`
                    : ''}
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-text-danger">Currently out of stock</p>
              )}

              {product.variants?.length ? (
                <div className="mt-5">
                  <span className="text-sm font-medium text-on-surface-variant">
                    {product.variants[0]?.label ?? 'Option'}
                  </span>
                  <div className="mt-2">
                    <VariantPills
                      onSelect={(id) => {
                        if (purchasePending || id === selectedVariantId) return;
                        submittedQuantity.current = false;
                        setChosenVariantId(id);
                        setQuantity(1);
                      }}
                      selectedId={selectedVariantId}
                      variants={product.variants}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <QuantitySelector key={selectedVariantId} value={quantity} max={maxQuantity} disabled={unavailable || purchasePending} onChange={(next) => {
                  if (next !== quantity) submittedQuantity.current = false;
                  setQuantity(next);
                }} />
                {!unavailable ? <p className="mt-1 text-xs text-text-secondary">Maximum {maxQuantity} per order for this option.</p> : null}
              </div>

              <div className="mt-6 grid gap-3">
                <Button
                  aria-label={unavailable ? 'Out of Stock' : `Add ${product.name}`}
                  className="h-11 w-full rounded-lg"
                  disabled={unavailable || purchasePending}
                  loading={isAdding}
                  variant="outline"
                  type="button"
                  onClick={async (event) => {
                    if (event.detail > 1 && submittedQuantity.current) return;
                    submittedQuantity.current = true;
                    const added = await add({
                      productId: product.id,
                      productName: product.name,
                      variantId: selectedVariantId,
                      variantLabel: selectedVariant?.value,
                      quantity,
                      availableStock,
                      slug: product.slug,
                      imageUrl: gallery[0]?.url,
                      unitPrice: effectivePrice(product.price, selectedVariant),
                    });
                    if (added) setQuantity(1);
                  }}
                >
                  {unavailable ? 'Out of Stock' : 'ADD'}
                </Button>
                <Button
                  className="h-12 w-full rounded-full border-primary bg-surface-container text-base text-primary hover:bg-surface-container-high"
                  disabled={unavailable || purchasePending}
                  loading={isBuyingNow}
                  variant="outline"
                  onClick={() =>
                    buyNow({
                      productId: product.id,
                      variantId: selectedVariantId,
                      quantity,
                    })
                  }
                >
                  <Zap aria-hidden="true" className="h-5 w-5" />
                  Buy Now
                </Button>
              </div>

              <div className="mt-6 grid gap-4 border-t border-surface-container pt-5">
                {/*
                  The fabricated "Delivery by Thu, Oct 24" and "Free delivery on orders over
                  ₹999" lines are gone: there is no delivery-estimate endpoint, and the delivery
                  fee is set server-side (truzov.commerce.delivery-fee) and shown on the order.
                */}
                {product.weight ? (
                  <div className="flex gap-4">
                    <span className="mt-0.5 grid h-5 w-5 place-items-center text-xs font-bold text-primary">
                      ⚖
                    </span>
                    <div>
                      <p className="font-medium">Net quantity</p>
                      <p className="text-xs text-on-surface-variant">{product.weight}</p>
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-4">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Authenticity Guaranteed</p>
                    <p className="text-xs text-on-surface-variant">
                      Full refund if lab test fails verification
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          <section className="order-4 grid min-w-0 gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-2">
            <div
              className="mt-2 flex gap-8 overflow-x-auto border-b border-outline-variant"
              role="tablist"
            >
              {TABS.map((item) => (
                <button
                  key={item}
                  aria-selected={tab === item}
                  className={cn(
                    'min-h-11 whitespace-nowrap pb-2 text-base font-medium',
                    tab === item
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                  onClick={() => setTab(item)}
                  role="tab"
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid h-[26rem] content-start gap-4 overflow-y-auto py-2" role="tabpanel" aria-label={tab}>
              {tab === 'Product Details' ? (
                <>
                  {product.description ? (
                    <p className="text-sm leading-relaxed text-on-surface-variant">
                      {product.description}
                    </p>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {product.ingredients.length ? (
                      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                        <p className="text-sm font-medium uppercase tracking-normal text-on-surface-variant">
                          Ingredients
                        </p>
                        <p className="mt-2 font-medium">{product.ingredients.join(', ')}</p>
                      </div>
                    ) : null}
                    {product.certifications.length ? (
                      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                        <p className="text-sm font-medium uppercase tracking-normal text-on-surface-variant">
                          Certifications
                        </p>
                        <p className="mt-2 font-medium">{product.certifications.join(', ')}</p>
                      </div>
                    ) : null}
                  </div>

                  {product.benefits.length ? (
                    <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
                      <h2 className="mb-3 font-body text-base font-semibold">Benefits</h2>
                      <ul className="grid gap-2">
                        {product.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-start gap-2 text-sm">
                            <CheckCircle2
                              aria-hidden="true"
                              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                            />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}

              {tab === 'Lab Report' ? (
                <div className="rounded-xl border border-outline-variant bg-white p-4">
                  {product.labMetrics.length ? (
                    <>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 font-body text-base font-semibold">
                          <Microscope aria-hidden="true" className="h-5 w-5 text-primary" />
                          Measured values
                        </h2>
                        <Badge variant={product.isLabVerified ? 'success' : 'info'}>
                          {humaniseSlug(product.verificationStatus)}
                        </Badge>
                      </div>
                      <div className="grid gap-3">
                        {product.labMetrics.map((metric) => (
                          <div
                            key={metric.label}
                            className="flex items-center justify-between rounded-lg bg-surface-container-low p-3"
                          >
                            <span>{metric.label}</span>
                            <strong className={metricToneClass(metric.status)}>
                              {metric.value}
                            </strong>
                          </div>
                        ))}
                      </div>
                      {/*
                        The PDF download used to live here. ProductDetailDto exposes labMetrics
                        but no report id or pdfUrl, so there is nothing to link to per-product —
                        see plan §T7. The public reports index is the honest destination until
                        the backend adds that field.
                      */}
                      <Link
                        className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg bg-surface-container-highest p-3 font-semibold transition hover:bg-surface-container-high"
                        href="/trust/lab-reports"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded bg-on-surface-variant text-white">
                          <FileText aria-hidden="true" className="h-4 w-4" />
                        </span>
                        Browse published lab reports
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      No lab measurements have been published for this product yet.
                    </p>
                  )}
                </div>
              ) : null}

              {tab === 'Reviews' ? (
                <div className="grid gap-3" id="reviews">
                  {reviewsQuery.isLoading ? (
                    <>
                      <Skeleton className="h-24 w-full rounded-lg" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </>
                  ) : reviewsQuery.isError ? (
                    <InlineError
                      error={reviewsQuery.error}
                      onRetry={() => void reviewsQuery.refetch()}
                    />
                  ) : reviewsQuery.data?.items.length ? (
                    reviewsQuery.data.items.map((review) => (
                      <article
                        key={review.id}
                        className="rounded-lg border border-outline-variant bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Rating rating={review.rating} />
                          {review.verified ? <Badge variant="success">Verified</Badge> : null}
                        </div>
                        {review.title ? (
                          <h3 className="mt-2 font-body text-base font-semibold">{review.title}</h3>
                        ) : null}
                        {review.body ? (
                          <p className="mt-1 text-sm text-on-surface-variant">{review.body}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-on-surface-variant">
                          {review.userName} &middot;{' '}
                          {new Date(review.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      No reviews yet for this product.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </section>




        </div>

        {/* Real recommendations, replacing two hardcoded products with invented prices. Hidden
            entirely when empty or failing — a missing recommendation strip is not worth an
            error banner on an otherwise working page. */}
        {relatedQuery.data?.length ? (
          <section className="mt-16 lg:mt-24">
            <div className="mb-8 flex items-end justify-between border-b border-outline-variant pb-2">
              <div>
                <h2 className="font-body text-2xl font-medium">Related products</h2>
                <p className="text-on-surface-variant">
                  Other lab-tested staples from verified vendors.
                </p>
              </div>
              <Link className="text-sm font-medium text-accent-link hover:underline" href="/products">
                View All
              </Link>
            </div>
            <ProductGrid products={relatedQuery.data} />
          </section>
        ) : null}
      </div>

      {lightboxProduct === slug && selectedImage ? (
        <ProductImageLightbox
          images={gallery}
          index={imageIndex}
          onClose={closeViewer}
          onIndexChange={setSelectedImageIndex}
        />
      ) : null}
    </div>
  );
}

/** Lab metric values are colour-coded by the server's own pass/warning/fail status. */
function metricToneClass(status: LabMetricStatus): string {
  if (status === 'fail') return 'text-text-danger';
  if (status === 'warning') return 'text-brand-accent';
  return 'text-primary';
}
