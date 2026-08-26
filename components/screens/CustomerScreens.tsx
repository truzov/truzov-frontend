'use client';

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Heart,
  Leaf,
  Microscope,
  PackageCheck,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
  MapPin,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, InlineError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Rating } from '@/components/ui/Rating';
import {
  AddressesScreenSkeleton,
  HomeScreenSkeleton,
  LabReportsScreenSkeleton,
  OrderDetailScreenSkeleton,
  OrdersScreenSkeleton,
  Skeleton,
} from '@/components/ui/Skeleton';
import { OrderItemRow } from '@/components/commerce/OrderItemRow';
import { ProductGrid } from '@/components/product/ProductGrid';
import { formatAddress } from '@/components/checkout/CheckoutScreens';
import {
  useBanners,
  useCategories,
  useHome,
  useLabReports,
  useProductList,
  useProductsByIds,
} from '@/hooks/api/useCatalog';
import { useWishlist } from '@/hooks/api/useWishlist';
import { useAddresses, useCancelOrder, useOrder, useOrders } from '@/hooks/api/useCommerce';
import { DEFAULT_PRODUCT_LIMIT } from '@/lib/api/endpoints/catalog';
import { ORDER_PAGE_LIMIT } from '@/lib/api/endpoints/orders';
import { ERROR_CODES, isApiError } from '@/lib/api/errors';
import {
  activeFilterEntries,
  toProductListParams,
  type ProductFilterState,
} from '@/lib/utils/filters';
import { formatCurrency } from '@/lib/utils/money';
import { displayImages, humaniseSlug } from '@/lib/utils/product';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { AddressFormModal } from '@/components/checkout/AddressFormModal';
import type { OrderStatus } from '@/types/api';

function TrustStrip() {
  const items = [
    [ShieldCheck, 'Certified Organic Sources'],
    [CreditCard, 'Secure Checkout'],
    [Microscope, 'Third-Party Lab Audited'],
    [Truck, 'Temperature Controlled'],
  ] as const;

  return (
    <section className="border-y border-outline-variant bg-surface-container-high py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-6 text-on-surface md:justify-between">
        {items.map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-3">
            <Icon aria-hidden="true" className="h-5 w-5 fill-current text-primary" />
            <span className="text-sm font-bold">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeScreen() {
  const { data, isLoading, isError, error, refetch } = useHome();

  /**
   * Verified against the running backend: `GET /home` returns `banners: []` even though
   * `GET /banners?placement=hero` returns the seeded hero record. So the hero falls back to the
   * dedicated endpoint when /home supplies none. `enabled` means the extra request only happens
   * while that gap exists and stops on its own once /home includes banners (plan §T8).
   */
  const heroFallback = useBanners('hero', Boolean(data) && data?.banners.length === 0);

  // One request backs this whole page (`GET /home` returns banners, categories, bestSellers,
  // newArrivals and featured together), so a single skeleton/error pair covers it rather than
  // each section loading independently and the layout jumping four times.
  if (isLoading) {
    return <HomeScreenSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          error={error}
          title="We could not load the homepage"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  // Pick the hero by placement rather than index. `banners[0]` happened to work against
  // fixtures but is arbitrary against real data, where placements are a marketing concern and
  // ordering is not guaranteed. Falls back to any active banner so a renamed placement degrades
  // to "wrong banner" instead of "no hero".
  const availableBanners = data.banners.length ? data.banners : heroFallback.data ?? [];
  const hero =
    availableBanners.find((banner) => banner.placement === 'hero' && banner.active) ??
    availableBanners.find((banner) => banner.active);
  const heroImage = hero?.imageUrl;

  const categories = data.categories;
  // Best sellers are the intended carousel content; `featured` is a reasonable stand-in on a
  // young catalogue where nothing has sold yet.
  const carouselSource = data.bestSellers.length ? data.bestSellers : data.featured;
  // The track is a CSS marquee, so it needs enough tiles to fill the viewport twice over to
  // loop without a visible gap. Duplicating only when the list is short avoids rendering a
  // large catalogue twice for no reason.
  const carouselProducts =
    carouselSource.length > 0 && carouselSource.length < 8
      ? [...carouselSource, ...carouselSource]
      : carouselSource;

  return (
    <>
      <section className="bg-primary py-16 text-white md:py-32">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 md:flex-row md:gap-12">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide">
              <BadgeCheck aria-hidden="true" className="h-4 w-4 fill-current" />
              Clinically Audited Inventory
            </div>
            <h1 className="text-[36px] font-black leading-[1.1] tracking-tight md:text-[64px]">
              {hero?.headline ?? 'Scientific Purity.'}
            </h1>
            {hero?.subtext ? (
              <p className="mx-auto max-w-lg text-base leading-relaxed text-white/90 md:mx-0 md:text-lg">
                {hero.subtext}
              </p>
            ) : null}
            <div className="pt-2">
              <Link
                className="inline-flex items-center rounded-full bg-white px-8 py-4 font-bold text-primary shadow-md transition hover:bg-white/90"
                href={hero?.href ?? '/products'}
              >
                {hero?.ctaLabel ?? 'Browse Marketplace'}
              </Link>
            </div>
          </div>
          {/* `imageUrl` is optional on BannerDto, and the backend omits null fields entirely,
              so the whole panel is conditional rather than passing undefined to next/image. */}
          {heroImage ? (
            <div className="relative w-full max-w-[340px] flex-shrink-0 md:max-w-none md:flex-1">
              <div className="aspect-square overflow-hidden rounded-[3rem] border-[12px] border-white/10 shadow-2xl">
                <Image
                  alt={hero?.headline ?? 'Featured promotion'}
                  className="object-cover"
                  fill
                  priority
                  sizes="(min-width: 1024px) 45vw, 340px"
                  src={heroImage}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <TrustStrip />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="mb-10 text-center font-heading text-2xl text-on-surface md:text-left">
          Shop by Lab-Verified Category
        </h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              className="group flex cursor-pointer flex-col items-center gap-4"
              href={`/category/${category.slug}`}
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-3xl border-2 border-transparent bg-surface-container shadow-md transition group-hover:border-primary group-hover:shadow-lg">
                {/* `image` is optional on CategoryDto and omitted when null, so it cannot be
                    passed straight to next/image — an undefined src throws at render. */}
                {category.image ? (
                  <Image
                    alt={category.name}
                    className="object-cover transition group-hover:scale-105"
                    fill
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                    src={category.image}
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-xs text-on-surface-variant">
                    {category.name}
                  </span>
                )}
              </div>
              <p className="text-center text-sm font-bold">{category.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-surface-container-low py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl text-on-surface">Verified Best-Sellers</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Top performing products from our last 24-hour lab audit cycle.
              </p>
            </div>
            <Link
              className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary hover:underline"
              href="/products"
            >
              View All
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-hidden">
            {carouselProducts.length === 0 ? (
              <p className="py-6 text-sm text-on-surface-variant">
                No products are available yet. Check back shortly.
              </p>
            ) : null}
            <div className="carousel-track gap-4 py-2">
              {carouselProducts.map((product, idx) => {
                const image = displayImages(product.images, product.name)[0];

                return (
                <div
                  key={`${product.id}-${idx}`}
                  className="w-[200px] flex-shrink-0 sm:w-[220px] lg:w-[calc((100%-48px)/4)]"
                >
                  <Link
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm transition hover:shadow-md"
                    href={`/products/${product.slug}`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-surface-container">
                      {/* Previously `src={product.images[0]?.url ?? ''}`. An empty string is not
                          a valid src and next/image rejects it, so the absent case is handled as
                          a placeholder instead. */}
                      {image ? (
                        <Image
                          alt={image.alt}
                          className="object-cover"
                          fill
                          sizes="(min-width: 1024px) 25vw, 220px"
                          src={image.url}
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                          {humaniseSlug(product.categorySlug)}
                        </p>
                        <h3 className="mt-0.5 text-sm font-bold leading-snug text-on-surface line-clamp-2">
                          {product.name}
                        </h3>
                      </div>
                      <Rating rating={product.rating} />
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <span className="text-base font-bold text-primary">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                          <ShoppingCart aria-hidden="true" className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-[2] rounded-[2rem] border border-gray-100 bg-white p-10 shadow-sm">
              <h2 className="mb-12 text-[28px] font-extrabold text-on-surface">Why truzov?</h2>
              <div className="relative flex flex-col gap-8 md:flex-row md:gap-4">
                <div className="absolute left-[10%] right-[10%] top-10 hidden h-px bg-gray-200 md:block" />
                {[
                  {
                    step: '1. Sourced',
                    text: 'Carefully sourced from trusted farmers & brands',
                    icon: Leaf,
                  },
                  {
                    step: '2. Lab Tested',
                    text: 'Every batch tested in NABL accredited labs',
                    icon: Microscope,
                  },
                  {
                    step: '3. Verified',
                    text: 'We verify results for purity & authenticity',
                    icon: ShieldCheck,
                  },
                  {
                    step: '4. Delivered',
                    text: 'Delivered to you with complete transparency',
                    icon: Truck,
                  },
                ].map(({ step, text, icon: Icon }) => (
                  <div
                    key={step}
                    className="relative z-10 flex flex-1 flex-col items-center text-center"
                  >
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white bg-brand-light shadow-sm">
                      <Icon aria-hidden="true" className="h-8 w-8 text-brand-primary" />
                    </div>
                    <h3 className="mb-2 text-sm font-bold text-on-surface">{step}</h3>
                    <p className="max-w-[140px] text-xs leading-relaxed text-on-surface-variant">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[2rem] bg-[#f0f9f0] p-10">
              <div className="z-10">
                <h2 className="mb-4 text-[28px] font-extrabold text-on-surface">
                  See the Proof, Always
                </h2>
                <p className="mb-10 max-w-[240px] text-sm leading-relaxed text-on-surface-variant">
                  Every product comes with a lab report. Because you deserve to know what you eat.
                </p>
                <Link
                  className="inline-flex rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white transition hover:bg-primary/90"
                  href="/trust/lab-reports"
                >
                  View Lab Reports
                </Link>
              </div>
              <div className="absolute bottom-0 right-0 p-4 opacity-40">
                <div className="relative flex h-32 w-24 flex-col gap-2 rounded-tr-3xl bg-[#c9e0c9] p-4">
                  <div className="h-1.5 w-full rounded-full bg-white" />
                  <div className="h-1.5 w-full rounded-full bg-white" />
                  <div className="h-1.5 w-2/3 rounded-full bg-white" />
                  <div className="absolute -left-4 -top-4 rounded-full bg-white p-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-0 grid grid-cols-2 gap-8 border-t border-gray-100 py-8 md:grid-cols-4">
            {[
              { icon: Truck, title: '2-3 Days Delivery', sub: 'Across Major Cities' },
              { icon: ArrowRight, title: 'Hassle Free Returns', sub: 'Easy 7 Days Return' },
              { icon: ShieldCheck, title: 'Secure Payments', sub: '100% Safe & Secure' },
              { icon: Zap, title: 'Dedicated Support', sub: "We're Here to Help" },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-4">
                <Icon aria-hidden="true" className="h-7 w-7 flex-shrink-0 text-brand-primary" />
                <div>
                  <p className="text-sm font-extrabold text-on-surface">{title}</p>
                  <p className="text-xs text-on-surface-variant">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FilterPanel({ filters }: { filters: ProductFilterState }) {
  const { data: categories, isLoading, isError } = useCategories();

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
            {/* Categories load separately from the product list, so this block degrades on its
                own. A failure here must not block the grid: browsing by URL still works
                without the sidebar, so the category list is simply omitted rather than
                escalated into a page-level error. */}
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-28" />
              </>
            ) : isError ? (
              <p className="text-xs text-text-muted">Categories are unavailable right now.</p>
            ) : (
              categories?.map((category) => (
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
              ))
            )}
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
  const [page, setPage] = useState(filters.page ?? 1);

  // Filtering, sorting and paging are the server's job now. `filterProducts` used to run over a
  // fixture array in the browser; doing that over one page of API results would silently
  // disagree with `total` and quietly hide products.
  const params = useMemo(
    () => toProductListParams(filters, { page, limit: DEFAULT_PRODUCT_LIMIT }),
    [filters, page]
  );

  const { data, isLoading, isError, error, isFetching, refetch } = useProductList(params);

  // Identity of the filter set, ignoring the page. Changing a filter must return to page 1 —
  // otherwise switching category while on page 3 asks for a page that often does not exist and
  // renders an empty grid that looks like "no products in this category".
  const filterIdentity = useMemo(
    () => JSON.stringify(toProductListParams(filters, { page: 1 })),
    [filters]
  );

  useEffect(() => {
    setPage(1);
  }, [filterIdentity]);

  const activeFilters = activeFilterEntries(filters);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? DEFAULT_PRODUCT_LIMIT;
  const lastPage = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 text-sm text-text-secondary">
        <Link href="/">Home</Link> <span>&gt;</span> <span>{title}</span>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl capitalize">{title}</h1>
          {/* `total` is the full server-side count, not `items.length` — the latter would read
              "Showing 24 products" on a catalogue of 500. */}
          <p className="mt-1 text-text-secondary">
            {isLoading ? 'Loading products...' : `Showing ${items.length} of ${total} products`}
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
              {key}: {value}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <FilterPanel filters={filters} />
        </div>
        <div>
          {isError ? (
            <ErrorState
              error={error}
              title="We could not load these products"
              onRetry={() => void refetch()}
            />
          ) : isLoading ? (
            <ProductGrid loading products={[]} skeletonCount={DEFAULT_PRODUCT_LIMIT} />
          ) : items.length ? (
            <>
              {/* isFetching without isLoading means a page change with cached rows still on
                  screen (placeholderData). Dimming beats a skeleton here: it keeps scroll
                  position instead of collapsing the grid height. */}
              <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
                <ProductGrid priorityCount={4} products={items} />
              </div>

              {lastPage > 1 ? (
                <nav
                  aria-label="Product pages"
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  <Button
                    disabled={page <= 1 || isFetching}
                    variant="outline"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <span aria-live="polite" className="text-sm text-text-secondary">
                    Page {page} of {lastPage}
                  </span>
                  <Button
                    disabled={page >= lastPage || isFetching}
                    variant="outline"
                    onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                  >
                    Next
                  </Button>
                </nav>
              ) : null}
            </>
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
    </div>
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
    label: 'OVERVIEW',
    items: [{ label: 'Profile', href: '/account' }],
  },
  {
    label: 'ORDERS',
    items: [{ label: 'Orders & Returns', href: '/account/orders' }],
  },
  {
    label: 'MANAGE',
    items: [
      { label: 'Addresses', href: '/account/addresses' },
      { label: 'Settings', href: '/account/settings' },
    ],
  },
];

function AccountPanel({
  children,
  title,
  titleAction,
}: {
  children: React.ReactNode;
  title: string;
  titleAction?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-surface-border bg-surface-base p-6 shadow-sm lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="font-heading text-xl text-text-primary">{title}</h2>
        {titleAction}
      </div>
      <hr className="mt-4 border-surface-border" />
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AccountSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="h-fit rounded-3xl border border-surface-border bg-white p-5 shadow-sm lg:sticky lg:top-28">
      <div className="border-b border-surface-border pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">Account</p>
        <p className="mt-1 font-heading text-2xl text-text-primary">{userName}</p>
        <p className="mt-1 text-sm text-text-secondary">Manage orders, addresses, and preferences.</p>
      </div>
      <nav className="mt-5 grid gap-5">
        {accountNavSections.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
              {section.label}
            </p>
            <ul className="mt-3 grid gap-1">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/account' && pathname.startsWith(`${item.href}/`));

                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-2xl px-3 py-2.5 text-sm transition ${
                        active
                          ? 'bg-brand-light font-semibold text-brand-primary'
                          : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AccountScreen() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const isSaving = useAuthStore((state) => state.isLoading);
  const saveError = useAuthStore((state) => state.error);
  const [editing, setEditing] = useState(false);
  /**
   * Only the four fields `PATCH /users/me` accepts.
   *
   * Gender, date of birth and location used to be here. No product DTO or request body has a
   * home for them, so they were removed rather than left as inputs that accept typing and throw
   * it away on save — which is what the previous local-only `updateProfile` did (plan §6.1).
   * `avatarUrl` is accepted by the endpoint but there is no upload flow, so it is not exposed.
   */
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const displayName = user?.name || 'Guest';

  function startEdit() {
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    try {
      await updateProfile({
        name: form.name.trim(),
        // Sent only when non-empty. The backend validates these when present, so passing '' for
        // an unset optional field is a validation error rather than a no-op.
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      setEditing(false);
    } catch {
      // Kept in edit mode on failure so the user's input is not lost. The message is rendered
      // from the store below.
    }
  }

  const profileRows = [
    { label: 'Full Name', value: user?.name || '—' },
    {
      label: 'Mobile Number',
      value: user?.phone || '— not added —',
      // Surfaced because it is not cosmetic: an unverified phone blocks checkout with a
      // 403 PHONE_NOT_VERIFIED, so the user needs to see it before they hit that wall.
      verified: user?.phone ? user.phoneVerified : undefined,
    },
    { label: 'Email ID', value: user?.email || '— not added —', verified: user?.email ? user.emailVerified : undefined },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <AccountPanel title={`Profile Details${displayName ? ` for ${displayName}` : ''}`}>
        {editing ? (
          <div className="grid gap-5">
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
            {/* Changing either channel clears its verification server-side, so the user is told
                before they save rather than discovering it at checkout. */}
            <p className="text-xs text-text-secondary">
              Changing your email or mobile number means that channel has to be verified again.
            </p>
            {saveError ? (
              <p className="rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger">
                {saveError}
              </p>
            ) : null}
            <div className="flex gap-3 pt-2">
              <Button
                className="px-10 uppercase tracking-wider"
                disabled={isSaving}
                loading={isSaving}
                variant="primary"
                onClick={() => void saveEdit()}
              >
                Save
              </Button>
              <Button
                className="px-10 uppercase tracking-wider"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <dl className="grid gap-y-5">
              {profileRows.map(({ label, value, verified }) => (
                <div key={label} className="grid grid-cols-[180px_1fr] items-start gap-4">
                  <dt className="text-sm text-text-secondary">{label}</dt>
                  <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-primary">
                    {value}
                    {verified === true ? <Badge variant="success">Verified</Badge> : null}
                    {verified === false ? <Badge variant="info">Not verified</Badge> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-8">
              <Button
                className="px-12 uppercase tracking-wider"
                variant="primary"
                onClick={startEdit}
              >
                Edit
              </Button>
            </div>
          </>
        )}
      </AccountPanel>
    </div>
  );
}

export function OrdersScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching, refetch } = useOrders(page);

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? ORDER_PAGE_LIMIT;
  const lastPage = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-4xl">
      <AccountPanel title="Orders & Returns">
        {isLoading ? (
          <OrdersScreenSkeleton />
        ) : isError ? (
          <ErrorState
            error={error}
            title="We could not load your orders"
            onRetry={() => void refetch()}
          />
        ) : orders.length === 0 ? (
          // No fixture fallback. The old screen showed `orders` from fixtures whenever the local
          // store was empty, so a brand-new customer saw two orders that were not theirs.
          <EmptyState
            action="Start Shopping"
            href="/products"
            icon={PackageCheck}
            message="Orders you place will appear here with their delivery and payment status."
            title="No orders yet"
          />
        ) : (
          <>
            <div className={cn('grid gap-4', isFetching && 'opacity-60')}>
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-lg border border-surface-border bg-surface-raised p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      {/* orderNumber for display, id for links — they are different fields. */}
                      <h3 className="font-semibold">{order.orderNumber}</h3>
                      <p className="text-sm text-text-secondary">
                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <Badge variant="info">{order.status}</Badge>
                      {/* Payment status is separate from fulfilment status and matters to the
                          customer, so both are shown rather than collapsed into one. */}
                      <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'info'}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    {/* OrderSummaryDto has only `itemCount`, not the item names — those need the
                        detail endpoint, so the count is what an honest summary can show. */}
                    <p className="text-sm text-text-secondary">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} &middot;{' '}
                      {formatCurrency(order.totalAmount)}
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

            {lastPage > 1 ? (
              <nav aria-label="Order pages" className="mt-6 flex items-center justify-center gap-4">
                <Button
                  disabled={page <= 1 || isFetching}
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span aria-live="polite" className="text-sm text-text-secondary">
                  Page {page} of {lastPage}
                </span>
                <Button
                  disabled={page >= lastPage || isFetching}
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </AccountPanel>
    </div>
  );
}

/** The documented fulfilment sequence. `cancelled` and `returned` are terminal, not steps. */
const ORDER_TIMELINE: OrderStatus[] = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

export function OrderDetailScreen({ id }: { id: string }) {
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const cancelOrder = useCancelOrder();

  if (isLoading) {
    return (
      <AccountPanel title="Order">
        <OrderDetailScreenSkeleton />
      </AccountPanel>
    );
  }

  if (isApiError(error) && error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
    // A real not-found instead of the old `findOrder(id)`, which fell back to `orders[0]` and so
    // showed a DIFFERENT order's contents and total for any unknown id.
    return (
      <AccountPanel title="Order">
        <EmptyState
          action="Back to orders"
          href="/account/orders"
          icon={PackageCheck}
          message="We could not find that order on your account."
          title="Order not found"
        />
      </AccountPanel>
    );
  }

  if (isError || !order) {
    return (
      <AccountPanel title="Order">
        <ErrorState
          error={error}
          title="We could not load this order"
          onRetry={() => void refetch()}
        />
      </AccountPanel>
    );
  }

  const currentStep = ORDER_TIMELINE.indexOf(order.status);
  const isTerminal = order.status === 'cancelled' || order.status === 'returned';
  /**
   * Customers may cancel only before fulfilment; anything later is a 409 invalid transition. The
   * button is hidden rather than shown-and-refused, so the UI never offers an action the server
   * will reject.
   */
  const canCancel = order.status === 'pending' || order.status === 'confirmed';

  return (
    <AccountPanel
      title={`Order ${order.orderNumber}`}
      titleAction={
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{order.status}</Badge>
          <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'info'}>
            {order.paymentStatus}
          </Badge>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-4">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}

          <div className="rounded-2xl border border-surface-border bg-surface-base p-5">
            <h2 className="font-semibold">Timeline</h2>
            {isTerminal ? (
              <p className="mt-3 text-sm text-text-secondary">
                This order was {order.status}
                {order.updatedAt
                  ? ` on ${new Date(order.updatedAt).toLocaleDateString('en-IN')}`
                  : ''}
                .
              </p>
            ) : (
              // Driven by the real status. The old version was a hardcoded four-step list including
              // "Processing", which is not a status this API has.
              <ol className="mt-4 grid gap-3 text-sm">
                {ORDER_TIMELINE.map((step, index) => {
                  const done = index <= currentStep;

                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'grid h-7 w-7 place-items-center rounded-full',
                          done
                            ? 'bg-brand-primary text-text-inverse'
                            : 'bg-brand-light text-brand-primary'
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          'capitalize',
                          done ? 'font-semibold text-text-primary' : 'text-text-secondary'
                        )}
                      >
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-surface-border bg-surface-base p-5">
          {/*
            "Delivering to" is gone: OrderDto has no address field, so there is nothing to render
            here without inventing it (plan §T5). Money below is entirely the server's.
          */}
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Delivery</span>
              <span>
                {order.deliveryFee === 0 ? 'Free' : formatCurrency(order.deliveryFee)}
              </span>
            </div>
          </div>
          <p className="mt-4 border-t border-surface-border pt-4 text-2xl font-semibold">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="mt-2 text-xs text-text-secondary">
            Placed {new Date(order.createdAt).toLocaleDateString('en-IN')}
          </p>

          {/* "Download Invoice" removed — there is no invoice endpoint (plan §6.1). */}
          {canCancel ? (
            <Button
              className="mt-5 w-full"
              disabled={cancelOrder.isPending}
              loading={cancelOrder.isPending}
              variant="outline"
              onClick={() => cancelOrder.mutate({ orderId: order.id })}
            >
              Cancel Order
            </Button>
          ) : null}
        </aside>
      </div>
    </AccountPanel>
  );
}

export function AddressesScreen() {
  const { addresses, isLoading, isError, error, refetch } = useAddresses();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AccountPanel
        title="Saved Addresses"
        titleAction={
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            Add New Address
          </Button>
        }
      >
        {isLoading ? (
          <AddressesScreenSkeleton />
        ) : isError ? (
          <ErrorState
            error={error}
            title="We could not load your addresses"
            onRetry={() => void refetch()}
          />
        ) : addresses.length === 0 ? (
          <EmptyState
            action="Browse Products"
            href="/products"
            icon={MapPin}
            message="Add a delivery address and it will be available at checkout."
            title="No saved addresses"
          />
        ) : (
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="flex h-full flex-col rounded-xl border border-surface-border bg-surface-base p-5 shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary"
                      />
                      <div className="min-w-0">
                        <h2 className="font-semibold text-text-primary">
                          {address.fullName ?? address.label ?? 'Saved address'}
                        </h2>
                        {/* Every field except line1 is optional on AddressDto, and the backend
                            omits nulls entirely, so each one is rendered conditionally. */}
                        {address.phone ? (
                          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                            <Phone
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 text-brand-primary"
                            />
                            <span>{address.phone}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {address.isDefault ? <Badge variant="success">Default</Badge> : null}
                  </div>

                  <div className="mt-4 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">Address</p>
                    <p className="mt-1">{formatAddress(address)}</p>
                  </div>
                </div>

                {/*
                  Set as Default / Edit / Delete removed. Only GET and POST exist for addresses
                  (plan §T6) — those buttons previously mutated local Zustand state, so the change
                  looked applied and then silently reverted on the next load.
                */}
              </article>
            ))}
          </div>
        )}

        <p className="mt-5 rounded-2xl border border-dashed border-surface-border bg-surface-raised/50 p-4 text-sm text-text-secondary">
          Addresses cannot be edited or removed yet. Add a new address and select it at checkout.
        </p>

        <AddressFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </AccountPanel>
    </div>
  );
}

export function SettingsScreen() {
  const { user } = useAuthStore();

  const settingsRows = [
    { label: 'Email notifications', value: 'Order updates and delivery alerts' },
    { label: 'Login email', value: user?.email ?? 'Not set' },
    { label: 'Mobile number', value: user?.phone ?? 'Not added' },
    { label: 'Language', value: 'English (India)' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AccountPanel
        title="Settings"
        titleAction={<Button variant="outline">Update Preferences</Button>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {settingsRows.map(({ label, value }) => (
            <article
              key={label}
              className="rounded-2xl border border-surface-border bg-surface-base p-5"
            >
              <p className="text-sm font-semibold text-text-primary">{label}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{value}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-surface-border bg-surface-raised/50 p-5 text-sm text-text-secondary">
          This section is ready for password, notification, and privacy controls when those
          settings are backed by API endpoints.
        </div>
      </AccountPanel>
    </div>
  );
}

export function WishlistScreen() {
  const { items, isLoading, isError, error, refetch } = useWishlist();

  // WishlistItemDto carries a productId but its display fields are not documented, so the full
  // summaries are resolved in one batch call. That also means the saved items render through the
  // same ProductCard as everywhere else — working heart, working add-to-cart, consistent badges
  // — instead of a second, thinner card implementation.
  const productIds = useMemo(() => items.map((item) => item.productId), [items]);
  const productsQuery = useProductsByIds(productIds);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 font-heading text-4xl">Wishlist</h1>
        <ProductGrid loading products={[]} skeletonCount={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <ErrorState
          error={error}
          title="We could not load your wishlist"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!items.length) {
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
      {/* The wishlist itself loaded; only the product details are still in flight. Showing
          skeletons for that second hop keeps the count visible without a blank screen. */}
      {productsQuery.isLoading ? (
        <ProductGrid loading products={[]} skeletonCount={items.length} />
      ) : productsQuery.isError ? (
        <InlineError error={productsQuery.error} onRetry={() => void productsQuery.refetch()} />
      ) : (
        <ProductGrid products={productsQuery.data ?? []} />
      )}
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
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching, refetch } = useLabReports(page);

  // Memoised so the `productIds` useMemo below has a stable dependency. Without it, `?? []`
  // creates a new array identity on every render and the batch lookup recomputes each time.
  const reports = useMemo(() => data?.items ?? [], [data?.items]);

  // Reports reference a product by id but carry no product name, so the names are resolved in
  // ONE batch call for the whole page. The previous version did `products.find(...) as Product`
  // against a fixture array — an unchecked cast that would throw the moment a report referenced
  // a product not in the list.
  const productIds = useMemo(() => reports.map((report) => report.productId), [reports]);
  const { data: linkedProducts } = useProductsByIds(productIds);

  const productById = useMemo(() => {
    const map = new Map<string, { name: string; slug: string }>();
    for (const product of linkedProducts ?? []) {
      map.set(product.id, { name: product.name, slug: product.slug });
    }
    return map;
  }, [linkedProducts]);

  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const lastPage = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-heading text-5xl">Lab Reports</h1>
      <p className="mt-3 text-text-secondary">
        Customer-facing excerpts from every published batch report.
      </p>

      {isLoading ? (
        <div className="mt-8">
          <LabReportsScreenSkeleton />
        </div>
      ) : isError ? (
        <div className="mt-8">
          <ErrorState
            error={error}
            title="We could not load the lab reports"
            onRetry={() => void refetch()}
          />
        </div>
      ) : reports.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            action="Browse Products"
            href="/products"
            icon={FileText}
            message="No batch reports have been published yet. They appear here once a lab result passes review."
            title="No reports published yet"
          />
        </div>
      ) : (
        <>
          <div className={cn('mt-8 grid gap-4 md:grid-cols-2', isFetching && 'opacity-60')}>
            {reports.map((report) => {
              // A report whose product has not resolved still renders — the batch id and lab
              // name are the useful identifiers, and the product may simply be unpublished.
              const product = productById.get(report.productId);

              return (
                <article
                  key={report.id}
                  className="rounded-lg border border-surface-border bg-surface-base p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-heading text-2xl">
                        {product ? (
                          <Link className="hover:text-brand-primary" href={`/products/${product.slug}`}>
                            {product.name}
                          </Link>
                        ) : (
                          `Batch ${report.batchId}`
                        )}
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Batch #{report.batchId} - {report.labName}
                      </p>
                    </div>
                    <Badge variant={report.status === 'pass' ? 'success' : 'info'}>
                      {report.status}
                    </Badge>
                  </div>

                  {report.summary ? (
                    <p className="mt-3 text-sm text-text-secondary">{report.summary}</p>
                  ) : null}

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

                  {/* `pdfUrl` is optional and omitted when absent, so the link is conditional
                      rather than rendered as a dead anchor. */}
                  {report.pdfUrl ? (
                    <a
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"
                      href={report.pdfUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <FileText aria-hidden="true" className="h-4 w-4" />
                      Download full report (PDF)
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>

          {lastPage > 1 ? (
            <nav aria-label="Report pages" className="mt-8 flex items-center justify-center gap-4">
              <Button
                disabled={page <= 1 || isFetching}
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span aria-live="polite" className="text-sm text-text-secondary">
                Page {page} of {lastPage}
              </span>
              <Button
                disabled={page >= lastPage || isFetching}
                variant="outline"
                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
