'use client';

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  Heart,
  Info,
  Leaf,
  MapPin,
  Microscope,
  PackageCheck,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Rating } from '@/components/ui/Rating';
import { Stepper } from '@/components/ui/Stepper';
import { CartItemRow } from '@/components/commerce/CartItemRow';
import { OrderSummary } from '@/components/commerce/OrderSummary';
import { ProductGrid } from '@/components/product/ProductGrid';
import {
  addresses,
  banners,
  categories,
  findOrder,
  findProduct,
  labReports,
  orders,
  products,
  reviews,
} from '@/lib/data/fixtures';
import { filterProducts, type ProductFilterState } from '@/lib/utils/filters';
import { calculateCartTotals, formatCurrency } from '@/lib/utils/money';
import { useCartStore } from '@/store/cart.store';
import { useUiStore } from '@/store/ui.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useAuthStore } from '@/store/auth.store';
import type { Product } from '@/types';

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-text-secondary">{eyebrow}</p> : null}
        <h2 className="font-heading text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function TrustStrip() {
  const items = [
    [Leaf, 'Certified Organic Sources'],
    [ShieldCheck, 'Third-Party Lab Audited'],
    [CreditCard, 'Secure Checkout'],
    [Truck, '2-3 Day Delivery'],
  ] as const;

  return (
    <div className="border-y border-surface-border bg-surface-overlay">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 text-sm text-text-secondary md:grid-cols-4">
        {items.map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-2">
            <Icon aria-hidden="true" className="h-4 w-4 text-brand-primary" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const hero = banners[0];
  const featured = products.filter((product) => product.isFeatured);
  const newArrivals = products.filter((product) => product.isNewArrival);

  return (
    <>
      <section className="bg-brand-primary text-text-inverse">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1fr_0.9fr] lg:py-20">
          <div>
            <Badge className="bg-brand-secondary text-text-inverse">
              Clinically audited inventory
            </Badge>
            <h1 className="mt-6 max-w-xl font-heading text-5xl">{hero.headline}</h1>
            <p className="mt-5 max-w-lg text-md text-brand-light">{hero.subtext}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-[52px] items-center justify-center rounded-md bg-surface-base px-6 font-semibold text-brand-primary"
                href={hero.href}
              >
                {hero.ctaLabel}
              </Link>
              <Link
                className="inline-flex h-[52px] items-center justify-center rounded-md border border-brand-light px-6 font-semibold text-text-inverse"
                href="/trust/how-it-works"
              >
                Learn verification
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-4 border-brand-secondary bg-brand-light">
            <Image alt={hero.headline} className="object-cover" fill priority src={hero.imageUrl} />
          </div>
        </div>
      </section>
      <TrustStrip />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeading eyebrow="Shop by lab-verified category" title="Popular categories" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              className="group rounded-md border border-surface-border bg-surface-base p-3 text-center shadow-xs transition hover:shadow-sm"
              href={`/category/${category.slug}`}
            >
              <div className="relative mx-auto aspect-square w-24 overflow-hidden rounded-md bg-surface-raised">
                <Image
                  alt={category.name}
                  className="object-cover transition group-hover:scale-105"
                  fill
                  src={category.image}
                />
              </div>
              <p className="mt-3 text-sm font-semibold">{category.name}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeading
            eyebrow="Verified best-sellers"
            title="Top performing products"
            action={
              <Link
                className="hidden text-sm font-semibold text-brand-primary sm:flex"
                href="/products"
              >
                View All Marketplace <ArrowRight aria-hidden="true" className="ml-1 h-4 w-4" />
              </Link>
            }
          />
          <ProductGrid priorityCount={4} products={featured} />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 lg:grid-cols-[1fr_0.55fr]">
        <div className="rounded-lg border border-surface-border bg-surface-base p-6">
          <SectionHeading title="Why Truzov?" />
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['1. Sourced', 'Carefully sourced from trusted farms and brands'],
              ['2. Lab Tested', 'Every batch tested in accredited labs'],
              ['3. Verified', 'Only passing products are sold'],
              ['4. Delivered', 'Cold-chain and secure delivery where needed'],
            ].map(([title, text]) => (
              <div key={title} className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-brand-light text-brand-primary">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs text-text-secondary">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-brand-light p-6">
          <h2 className="font-heading text-2xl">See the Proof, Always</h2>
          <p className="mt-3 text-sm text-text-secondary">
            Every product comes with a lab report excerpt because you deserve to know what you eat.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-text-inverse"
            href="/trust/lab-reports"
          >
            View Lab Reports
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeading eyebrow="New lab arrivals" title="Recently verified" />
        <ProductGrid products={newArrivals} />
      </section>
      <section className="bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeading eyebrow="Verified purchase reviews" title="Customers trust the reports" />
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.concat(reviews.slice(0, 1)).map((review, index) => (
              <article
                key={`${review.id}-${index}`}
                className="rounded-md border border-surface-border bg-surface-base p-5"
              >
                <Rating rating={review.rating} />
                <h3 className="mt-3 font-semibold">{review.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{review.body}</p>
                <Badge className="mt-4" variant="success">
                  Verified Purchase
                </Badge>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FilterPanel({ filters }: { filters: ProductFilterState }) {
  return (
    <aside className="rounded-lg border border-surface-border bg-surface-base p-4 lg:sticky lg:top-36">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl">Filters</h2>
        <Link className="text-sm font-semibold text-brand-primary" href="/products">
          Clear
        </Link>
      </div>
      <div className="mt-5 grid gap-5 text-sm">
        <div>
          <h3 className="font-semibold">Category</h3>
          <div className="mt-3 grid gap-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                className={
                  filters.category === category.slug
                    ? 'font-semibold text-brand-primary'
                    : 'text-text-secondary'
                }
                href={`/products?category=${category.slug}`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Trust</h3>
          <Link
            className="mt-3 flex items-center justify-between rounded-md bg-brand-light p-3 font-semibold text-brand-primary"
            href="/products?labVerified=true"
          >
            Lab Verified Only
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div>
          <h3 className="font-semibold">Sort</h3>
          <div className="mt-3 grid gap-2 text-text-secondary">
            <Link href="?sort=price_asc">Price: Low to High</Link>
            <Link href="?sort=price_desc">Price: High to Low</Link>
            <Link href="?sort=best_rated">Best Rated</Link>
            <Link href="?sort=best_selling">Best Selling</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ProductListingScreen({
  title = 'Verified Marketplace',
  filters,
}: {
  title?: string;
  filters: ProductFilterState;
}) {
  const visibleProducts = useMemo(() => filterProducts(products, filters), [filters]);
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== '' && value !== false
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 text-sm text-text-secondary">
        <Link href="/">Home</Link> <span>&gt;</span> <span>{title}</span>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">{title}</h1>
          <p className="mt-1 text-text-secondary">
            Showing {visibleProducts.length} laboratory-certified products
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-brand-primary px-4 text-sm font-semibold text-brand-primary lg:hidden"
          href="/products?labVerified=true"
        >
          Filters
        </Link>
      </div>
      {activeFilters.length ? (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="info">
              {key}: {String(value)}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <FilterPanel filters={filters} />
        </div>
        {visibleProducts.length ? (
          <ProductGrid priorityCount={4} products={visibleProducts} />
        ) : (
          <EmptyState
            action="Clear Filters"
            href="/products"
            icon={Search}
            message="No products found matching your filters."
            title="No matching products"
          />
        )}
      </div>
    </div>
  );
}

export function ProductDetailScreen({ slug }: { slug: string }) {
  const product = findProduct(slug) ?? products[0];
  const displayName = product.id === 'prd-001' ? 'Pure Honey (500g)' : product.name;
  const compareAtPrice = product.id === 'prd-001' ? 749 : product.mrp;
  const discount = Math.round((1 - product.price / compareAtPrice) * 100);
  const gallery = [
    product.images[0],
    ...product.images.slice(1),
    {
      id: 'honeycomb',
      url: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=900&q=80',
      alt: 'Honeycomb frame with raw honey',
    },
    {
      id: 'lab-flask',
      url: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=900&q=80',
      alt: 'Honey sample prepared for verification',
    },
    {
      id: 'packaging',
      url: 'https://images.unsplash.com/photo-1584646774031-2dd8915e2dc3?auto=format&fit=crop&w=900&q=80',
      alt: 'Honey jar packaging detail',
    },
  ].slice(0, 5);
  const [selectedImage, setSelectedImage] = useState(gallery[0]);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('Product Details');
  const addItem = useCartStore((state) => state.addItem);
  const addToast = useUiStore((state) => state.addToast);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const report = labReports.find((item) => item.id === product.labReportId);
  const similar = [
    {
      name: 'Organic Cinnamon (100g)',
      image:
        'https://images.unsplash.com/photo-1622798337764-259682f03741?auto=format&fit=crop&w=600&q=80',
      price: 249,
      rating: '4.8 (210)',
    },
    {
      name: 'Premium Saffron (1g)',
      image:
        'https://images.unsplash.com/photo-1600984218389-8f56de3f4f42?auto=format&fit=crop&w=600&q=80',
      price: 399,
      rating: '4.9 (540)',
    },
  ];

  const addToCart = () => {
    addItem(product, quantity);
    addToast({
      type: 'success',
      title: 'Added to cart',
      message: product.name,
      actionLabel: 'View cart',
      actionHref: '/cart',
    });
  };

  return (
    <div className="bg-background font-body text-on-surface">
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[5fr_4fr_3fr] lg:items-start">
          <section className="grid gap-2">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-outline-variant bg-white">
              <Image
                alt={selectedImage.alt}
                className="object-cover"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                src={selectedImage.url}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(1, 5).map((image, index) => (
                <button
                  key={image.id}
                  aria-label={`View product image ${index + 2}`}
                  className={`relative aspect-square overflow-hidden rounded-lg border bg-white ${
                    selectedImage.id === image.id ? 'border-2 border-primary' : 'border-outline-variant'
                  }`}
                  onClick={() => setSelectedImage(image)}
                >
                  <Image alt={image.alt} className="object-cover" fill sizes="12vw" src={image.url} />
                  {index === 3 ? (
                    <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-bold text-white">
                      +3
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <Link href="/products">Marketplace</Link>
              <ChevronRight aria-hidden="true" className="h-3 w-3" />
              <Link href={`/category/${product.category}`}>Health & Superfoods</Link>
              <ChevronRight aria-hidden="true" className="h-3 w-3" />
              <span className="font-medium text-primary">{displayName.replace(' (500g)', '')}</span>
            </nav>

            <div>
              <h1 className="font-body text-[32px] font-bold leading-tight text-on-surface">
                {displayName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Rating count={product.reviewCount} rating={product.rating} />
                <span className="text-sm text-on-surface-variant">
                  ({product.reviewCount.toLocaleString('en-IN')} Verified Reviews)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[32px] font-bold leading-none text-on-surface">
                {formatCurrency(product.price)}
              </span>
              <span className="text-base text-on-surface-variant line-through">
                {formatCurrency(compareAtPrice)}
              </span>
              <span className="rounded bg-error-container px-2 py-0.5 text-sm font-medium text-on-error-container">
                {discount}% OFF
              </span>
            </div>

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
                  Independently tested for 99.8% purity, 100% pesticide-free. Traceable to the
                  Himalayan foothills.
                </p>
              </div>
            </div>

            <div className="mt-2 flex gap-8 overflow-x-auto border-b border-outline-variant">
              {['Product Details', 'Lab Report', 'Reviews'].map((item) => (
                <button
                  key={item}
                  className={`whitespace-nowrap pb-2 text-base font-medium ${
                    tab === item
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid gap-4 py-2">
              {tab === 'Product Details' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                      <p className="text-sm font-medium uppercase tracking-normal text-on-surface-variant">
                        Ingredients
                      </p>
                      <p className="mt-2 font-medium">
                        {product.ingredients?.[0] ?? '100% Raw Honey'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                      <p className="text-sm font-medium uppercase tracking-normal text-on-surface-variant">
                        Certifications
                      </p>
                      <p className="mt-2 font-medium">
                        {product.id === 'prd-001' ? 'FSSAI, ISO 22000' : product.certifications.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 font-body text-base font-semibold">
                        <Microscope aria-hidden="true" className="h-5 w-5 text-primary" />
                        Verification Summary
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-successBg px-2 py-0.5 text-sm font-medium text-text-success">
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        Passed
                      </span>
                    </div>
                    <div className="grid gap-1">
                      {[
                        ['Heavy Metals', 'ND (Not Detected)'],
                        ['Pesticide Residue', 'ND (Not Detected)'],
                        ['Antibiotics', 'Absent'],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between border-b border-surface-container py-1.5 last:border-0"
                        >
                          <span className="text-on-surface-variant">{label}</span>
                          <span className="font-medium text-primary">{value}</span>
                        </div>
                      ))}
                    </div>
                    <button className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg bg-surface-container-highest p-3 font-semibold transition hover:bg-surface-container-high">
                      <span className="grid h-7 w-7 place-items-center rounded bg-on-surface-variant text-white">
                        <FileText aria-hidden="true" className="h-4 w-4" />
                      </span>
                      Download Full Lab Report (PDF)
                    </button>
                  </div>
                </>
              ) : null}

              {tab === 'Lab Report' ? (
                <div className="rounded-xl border border-outline-variant bg-white p-4">
                  <p className="text-sm text-on-surface-variant">
                    Batch #{product.batchId}. {report?.summary ?? 'Lab report will be available after testing.'}
                  </p>
                  <div className="mt-4 grid gap-3">
                    {product.labMetrics.map((metric) => (
                      <div key={metric.label} className="flex justify-between rounded-lg bg-surface-container-low p-3">
                        <span>{metric.label}</span>
                        <strong className="text-primary">{metric.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {tab === 'Reviews' ? (
                <div id="reviews" className="grid gap-3">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-lg border border-outline-variant bg-white p-4">
                      <Rating rating={review.rating} />
                      <h3 className="mt-2 font-body text-base font-semibold">{review.title}</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">{review.body}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="grid gap-4 lg:sticky lg:top-36">
            <div className="rounded-xl border border-outline-variant bg-white p-6 shadow-md">
              <p className="text-xl font-medium">{formatCurrency(product.price)}.00</p>
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-text-success">
                <span className="h-2 w-2 rounded-full bg-text-success" />
                In stock. Ready to ship.
              </p>

              <div className="mt-5">
                <label className="text-sm font-medium text-on-surface-variant" htmlFor="qty">
                  Quantity
                </label>
                <div className="mt-2 flex w-fit overflow-hidden rounded-lg border border-outline-variant">
                  <button
                    className="h-10 w-10 bg-surface-container-highest text-lg transition hover:bg-surface-container-high"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    type="button"
                  >
                    -
                  </button>
                  <input
                    id="qty"
                    className="h-10 w-12 border-0 text-center font-medium outline-none"
                    readOnly
                    value={quantity}
                  />
                  <button
                    className="h-10 w-10 bg-surface-container-highest text-lg transition hover:bg-surface-container-high"
                    onClick={() => setQuantity(Math.min(product.stockCount || 1, quantity + 1))}
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <Button
                  className="h-12 w-full rounded-full bg-primary text-base text-on-primary hover:bg-primary/90"
                  disabled={!product.inStock}
                  onClick={addToCart}
                >
                  <ShoppingCart aria-hidden="true" className="h-5 w-5" />
                  Add to Cart
                </Button>
                <Link href="/checkout/address">
                  <Button
                    className="h-12 w-full rounded-full border-primary bg-surface-container text-base text-primary hover:bg-surface-container-high"
                    disabled={!product.inStock}
                    variant="outline"
                  >
                    <Zap aria-hidden="true" className="h-5 w-5" />
                    Buy Now
                  </Button>
                </Link>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <Button
                    className="h-auto rounded-lg border-primary/20 py-2 text-primary hover:bg-primary/5"
                    variant="outline"
                    onClick={() => toggleWishlist(product.id)}
                  >
                    <Heart aria-hidden="true" className="h-4 w-4" />
                    <span className="leading-tight">Add to Wishlist</span>
                  </Button>
                  <Button
                    className="h-auto rounded-lg border-primary/20 py-2 text-primary hover:bg-primary/5"
                    variant="outline"
                  >
                    <Share2 aria-hidden="true" className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 border-t border-surface-container pt-5">
                <div className="flex gap-4">
                  <Truck aria-hidden="true" className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Delivery by Thu, Oct 24</p>
                    <p className="text-xs text-on-surface-variant">Free delivery on orders over Rs 999</p>
                  </div>
                </div>
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

            <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
              <p className="flex items-center gap-2 font-medium">
                <Store aria-hidden="true" className="h-5 w-5 text-accent-link" />
                Sold by {product.sellerName}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">4.9/5 Rating &bull; 2k+ Sales</p>
            </div>
          </aside>
        </div>

        <section className="mt-16 lg:mt-24">
          <div className="mb-8 flex items-end justify-between border-b border-outline-variant pb-2">
            <div>
              <h2 className="font-body text-2xl font-bold">Similar Verified Products</h2>
              <p className="text-on-surface-variant">
                Other lab-tested health staples from verified vendors.
              </p>
            </div>
            <Link className="text-sm font-medium text-accent-link hover:underline" href="/products">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
            {similar.map((item) => (
              <article
                key={item.name}
                className="overflow-hidden rounded-xl border border-outline-variant bg-white transition hover:shadow-md"
              >
                <div className="relative aspect-square">
                  <Image alt={item.name} className="object-cover" fill sizes="220px" src={item.image} />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs font-semibold text-on-primary">
                    <BadgeCheck aria-hidden="true" className="h-3 w-3" />
                    Verified
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="truncate font-body text-base font-medium">{item.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-on-surface-variant">
                    <Star aria-hidden="true" className="h-3.5 w-3.5 fill-brand-accent text-brand-accent" />
                    {item.rating}
                  </p>
                  <p className="mt-2 font-semibold">{formatCurrency(item.price)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function CartScreen() {
  const items = useCartStore((state) => state.items);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          action="Start Shopping"
          href="/products"
          icon={ShoppingBag}
          message="Your cart feels light. Browse lab-verified staples and add a few favorites."
          title="Your cart is empty"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="mb-6 font-heading text-4xl">Your Shopping Cart</h1>
        <div className="grid gap-4">
          {items.map((item) => (
            <CartItemRow key={`${item.product.id}-${item.variantId ?? 'base'}`} item={item} />
          ))}
        </div>
      </section>
      <OrderSummary />
    </div>
  );
}

export function CheckoutAddressScreen() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <Stepper active={0} steps={['Address', 'Payment', 'Confirmation']} />
        <h1 className="mt-8 font-heading text-3xl">Select delivery address</h1>
        <div className="mt-5 grid gap-3">
          {addresses.map((address) => (
            <label
              key={address.id}
              className="flex gap-3 rounded-md border border-surface-border p-4"
            >
              <input defaultChecked={address.isDefault} name="address" type="radio" />
              <span>
                <strong>{address.fullName}</strong>
                <span className="mt-1 block text-sm text-text-secondary">
                  {address.addressLine1}, {address.city}, {address.state} - {address.pincode}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="Full name" placeholder="Asha Verma" />
          <Input label="Phone" placeholder="9876543210" />
          <Input label="Pincode" placeholder="560001" />
          <Input label="City" placeholder="Bengaluru" />
          <Input
            className="md:col-span-2"
            label="Address line 1"
            placeholder="Flat / house / street"
          />
        </div>
        <Link className="mt-6 inline-block" href="/checkout/payment">
          <Button size="lg">Continue to Payment</Button>
        </Link>
      </section>
      <OrderSummary checkoutHref="/checkout/payment" />
    </div>
  );
}

export function CheckoutPaymentScreen() {
  const [method, setMethod] = useState('UPI');
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const totals = calculateCartTotals(items, coupon);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <Stepper active={1} steps={['Address', 'Payment', 'Confirmation']} />
        <h1 className="mt-8 font-heading text-3xl">Choose payment mode</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="grid gap-2">
            {['UPI', 'Cards', 'Net Banking', 'Cash on Delivery'].map((item) => (
              <button
                key={item}
                className={`rounded-md border px-4 py-3 text-left font-semibold ${method === item ? 'border-brand-primary bg-brand-light text-brand-primary' : 'border-surface-border'}`}
                onClick={() => setMethod(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="rounded-md bg-surface-raised p-5">
            <h2 className="font-semibold">{method}</h2>
            {method === 'UPI' ? (
              <Input className="mt-4" label="UPI ID" placeholder="name@upi" />
            ) : null}
            {method === 'Cards' ? (
              <div className="mt-4 grid gap-4">
                <Input label="Card number" placeholder="4111 1111 1111 1111" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Expiry" placeholder="MM/YY" />
                  <Input label="CVV" placeholder="123" />
                </div>
              </div>
            ) : null}
            {method === 'Net Banking' ? (
              <Input className="mt-4" label="Bank" placeholder="Select bank" />
            ) : null}
            {method === 'Cash on Delivery' ? (
              <p className="mt-4 text-sm text-text-secondary">
                Cash on Delivery available for this address.
              </p>
            ) : null}
            <p className="mt-5 text-sm text-text-secondary">
              Payments secured by Razorpay. Mock payment for prototype.
            </p>
            <Link className="mt-5 inline-block" href="/checkout/confirm">
              <Button size="lg">Pay {formatCurrency(totals.total)}</Button>
            </Link>
          </div>
        </div>
      </section>
      <OrderSummary checkoutHref="/checkout/confirm" />
    </div>
  );
}

export function CheckoutConfirmScreen() {
  return (
    <section className="mx-auto max-w-3xl rounded-lg border border-surface-border bg-surface-base p-8 text-center">
      <Stepper active={2} steps={['Address', 'Payment', 'Confirmation']} />
      <CheckCircle2 aria-hidden="true" className="mx-auto mt-10 h-16 w-16 text-text-success" />
      <h1 className="mt-5 font-heading text-4xl">Your order is confirmed!</h1>
      <p className="mt-3 text-text-secondary">
        Order ID <span className="font-mono">TRZ-2026-1042</span> has been placed successfully.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          className="inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-text-inverse"
          href="/account/orders/TRZ-2026-1042"
        >
          Track Order
        </Link>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-brand-primary px-4 text-sm font-semibold text-brand-primary"
          href="/"
        >
          Continue Shopping
        </Link>
      </div>
    </section>
  );
}

export function SearchScreen({ query }: { query?: string }) {
  return (
    <ProductListingScreen
      filters={{ query, sort: 'relevance' }}
      title={query ? `Search results for "${query}"` : 'Search verified products'}
    />
  );
}

const accountNavSections = [
  {
    label: null,
    items: [{ label: 'Overview', href: '/account' }],
  },
  {
    label: 'ORDERS',
    items: [{ label: 'Orders & Returns', href: '/account/orders' }],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Profile', href: '/account', active: true },
      { label: 'Addresses', href: '/account/addresses' },
    ],
  },
];

function AccountSidebar({ userName }: { userName: string }) {
  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Account</p>
        <p className="mt-0.5 font-heading text-lg text-text-primary">{userName}</p>
      </div>
      <nav className="flex flex-col gap-4">
        {accountNavSections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
                {section.label}
              </p>
            )}
            <ul className="flex flex-col">
              {section.items.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className={`block py-1.5 text-sm transition-colors ${
                      'active' in item && item.active
                        ? 'font-semibold text-brand-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <hr className="mt-3 border-surface-border" />
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AccountScreen() {
  const { user, updateProfile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const displayName = user?.name || 'Guest';

  function startEdit() {
    setForm({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' });
    setEditing(true);
  }

  function saveEdit() {
    updateProfile({ name: form.name, email: form.email, phone: form.phone || undefined });
    setEditing(false);
  }

  const profileRows = [
    { label: 'Full Name', value: user?.name || '—' },
    { label: 'Mobile Number', value: user?.phone || '— not added —' },
    { label: 'Email ID', value: user?.email || '—' },
    { label: 'Gender', value: 'Not set' },
    { label: 'Date of Birth', value: '— not added —' },
    { label: 'Location', value: '— not added —' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <AccountSidebar userName={displayName} />

        <main className="flex-1">
          <div className="rounded-lg border border-surface-border bg-surface-base p-6 lg:p-8">
            <h2 className="font-heading text-xl text-text-primary">Profile Details</h2>
            <hr className="mt-4 border-surface-border" />

            {editing ? (
              <div className="mt-6 grid gap-5">
                <Input
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <Input
                  label="Email ID"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                <Input
                  label="Mobile Number"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <div className="flex gap-3 pt-2">
                  <Button className="px-10 uppercase tracking-wider" variant="primary" onClick={saveEdit}>
                    Save
                  </Button>
                  <Button className="px-10 uppercase tracking-wider" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <dl className="mt-6 grid gap-y-5">
                  {profileRows.map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[180px_1fr] items-start gap-4">
                      <dt className="text-sm text-text-secondary">{label}</dt>
                      <dd className="text-sm font-medium text-text-primary">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-8">
                  <Button className="px-12 uppercase tracking-wider" variant="primary" onClick={startEdit}>
                    Edit
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export function OrdersScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-4xl">Your Orders</h1>
      <div className="mt-6 grid gap-4">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-lg border border-surface-border bg-surface-base p-5"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">{order.id}</h2>
                <p className="text-sm text-text-secondary">
                  {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <Badge variant="info">{order.status}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-text-secondary">
                {order.items.map((item) => item.product.name).join(', ')}
              </p>
              <Link
                className="font-semibold text-brand-primary"
                href={`/account/orders/${order.id}`}
              >
                View Order
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function OrderDetailScreen({ id }: { id: string }) {
  const order = findOrder(id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-4xl">Order {order.id}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="grid gap-4">
          {order.items.map((item) => (
            <CartItemRow key={`${item.product.id}-${item.variantId ?? 'base'}`} item={item} />
          ))}
          <div className="rounded-lg border border-surface-border bg-surface-base p-5">
            <h2 className="font-semibold">Timeline</h2>
            <div className="mt-4 grid gap-3 text-sm text-text-secondary">
              {['Confirmed', 'Processing', 'Shipped', 'Delivered'].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-light text-brand-primary">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="rounded-lg border border-surface-border bg-surface-base p-5">
          <Badge variant="info">{order.status}</Badge>
          <p className="mt-4 text-sm text-text-secondary">Delivering to</p>
          <p className="font-semibold">{order.address.fullName}</p>
          <p className="text-sm text-text-secondary">
            {order.address.addressLine1}, {order.address.city}
          </p>
          <p className="mt-4 text-2xl font-semibold">{formatCurrency(order.total)}</p>
          <Button className="mt-5 w-full" variant="outline">
            Download Invoice
          </Button>
        </aside>
      </div>
    </div>
  );
}

export function AddressesScreen() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-4xl">Saved Addresses</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <article
            key={address.id}
            className="rounded-lg border border-surface-border bg-surface-base p-5"
          >
            <MapPin aria-hidden="true" className="h-5 w-5 text-brand-primary" />
            <h2 className="mt-3 font-semibold">{address.fullName}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {address.addressLine1}, {address.city}, {address.state} - {address.pincode}
            </p>
            {address.isDefault ? (
              <Badge className="mt-4" variant="success">
                Default
              </Badge>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export function WishlistScreen() {
  const ids = useWishlistStore((state) => state.ids);
  const wishlistProducts = products.filter((product) => ids.includes(product.id));

  if (!wishlistProducts.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          action="Browse Products"
          href="/products"
          icon={Heart}
          message="Save products you love and compare lab reports later."
          title="Save items you love"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 font-heading text-4xl">Wishlist</h1>
      <ProductGrid products={wishlistProducts} />
    </div>
  );
}

export function TrustHowItWorksScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="max-w-3xl font-heading text-5xl">Verification before checkout confidence.</h1>
      <p className="mt-4 max-w-2xl text-text-secondary">
        Truzov combines Amazon-like shopping speed with a transparent verification workflow for
        health, organic, and wellness products.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-4">
        {[
          [PackageCheck, 'Vendor submits product and compliance documents'],
          [ClipboardCheck, 'Samples are collected and assigned to partner labs'],
          [ShieldCheck, 'Reports are reviewed against product claims'],
          [Truck, 'Approved batches go live with report excerpts'],
        ].map(([Icon, text], index) => (
          <article
            key={text as string}
            className="rounded-lg border border-surface-border bg-surface-base p-5"
          >
            <Icon aria-hidden="true" className="h-8 w-8 text-brand-primary" />
            <h2 className="mt-4 font-heading text-2xl">Step {index + 1}</h2>
            <p className="mt-2 text-sm text-text-secondary">{text as string}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function LabReportsScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-heading text-5xl">Lab Reports</h1>
      <p className="mt-3 text-text-secondary">
        Customer-facing excerpts from every available batch report.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {labReports.map((report) => {
          const product = products.find((item) => item.id === report.productId) as Product;

          return (
            <article
              key={report.id}
              className="rounded-lg border border-surface-border bg-surface-base p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl">{product.name}</h2>
                  <p className="text-sm text-text-secondary">
                    Batch #{report.batchId} - {report.labName}
                  </p>
                </div>
                <Badge variant={report.status === 'pass' ? 'success' : 'info'}>
                  {report.status}
                </Badge>
              </div>
              <div className="mt-5 grid gap-3">
                {report.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex justify-between rounded-md bg-surface-raised p-3 text-sm"
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
