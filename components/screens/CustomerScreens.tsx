'use client';

import {
  ClipboardCheck,
  FileText,
  Heart,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  MapPin,
  ReceiptText,
  CircleUserRound,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PhoneChangeModal } from '@/components/auth/PhoneChangeModal';
import { ErrorState, InlineError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import {
  AddressesScreenSkeleton,
  LabReportsScreenSkeleton,
  OrderDetailScreenSkeleton,
  OrdersScreenSkeleton,
  Skeleton,
} from '@/components/ui/Skeleton';
import { OrderItemRow } from '@/components/commerce/OrderItemRow';
import { ProductGrid } from '@/components/product/ProductGrid';
import { MobileFilterSheet } from '@/components/product/MobileFilterSheet';
import { formatAddress } from '@/components/checkout/CheckoutScreens';
import { useCategories, useLabReports, useProductList, useProductsByIds } from '@/hooks/api/useCatalog';
import { useWishlist } from '@/hooks/api/useWishlist';
import { useAddresses, useCancelOrder, useOrder, useOrders } from '@/hooks/api/useCommerce';
import { DEFAULT_PRODUCT_LIMIT } from '@/lib/api/endpoints/catalog';
import { ORDER_PAGE_LIMIT } from '@/lib/api/endpoints/orders';
import { ERROR_CODES, isApiError } from '@/lib/api/errors';
import type { AddressDto } from '@/types/api';
import {
  activeFilterEntries,
  filtersToSearchParams,
  toProductListParams,
  type ProductFilterState,
} from '@/lib/utils/filters';
import { formatCurrency } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { AddressFormModal } from '@/components/checkout/AddressFormModal';
import type { OrderStatus } from '@/types/api';

export { HomeScreen } from './HomeScreen';

const SORT_OPTIONS: Array<[string, string]> = [
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['best_rated', 'Best Rated'],
  ['best_selling', 'Best Selling'],
];

/**
 * Desktop sidebar filter controls. Also reused inside the mobile filter sheet (see
 * `MobileFilterSheet` below) via the `draft`/`onDraftChange` props.
 *
 * Two modes:
 *  - Uncontrolled (desktop, `draft`/`onDraftChange` omitted): every control commits immediately
 *    by navigating to a new URL built from the *current* filters plus the one field being
 *    changed, via `filtersToSearchParams`. This replaces the old per-control hrefs, which were
 *    either absolute (`/products?labVerified=true`, wiping every other filter and navigating
 *    away from `/search` or `/category/[slug]`) or relative (`?sort=price_asc`, which replaces
 *    the whole query string in Next.js and silently drops sibling params).
 *  - Controlled (mobile sheet, `draft`/`onDraftChange` provided): controls mutate the draft
 *    object only; nothing navigates until the sheet's own Apply button commits it.
 */
function FilterPanel({
  filters,
  draft,
  onDraftChange,
}: {
  filters: ProductFilterState;
  draft?: ProductFilterState;
  onDraftChange?: (next: ProductFilterState) => void;
}) {
  const { data: categories, isLoading, isError } = useCategories();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = draft ?? filters;

  const commit = (patch: Partial<ProductFilterState>) => {
    const next: ProductFilterState = { ...active, ...patch };
    const search = filtersToSearchParams(next);

    // filtersToSearchParams deliberately excludes `q` (see its doc comment) — reattach it here
    // so a category/sort click on /search does not silently drop the in-flight search text.
    if (filters.query) {
      search.set('q', filters.query);
    }

    if (onDraftChange) {
      onDraftChange(next);
      return;
    }

    router.push(`${pathname}?${search.toString()}`);
  };

  const clear = () => {
    if (onDraftChange) {
      onDraftChange({ sort: active.sort });
      return;
    }

    if (filters.query) {
      router.push(`${pathname}?q=${encodeURIComponent(filters.query)}`);
      return;
    }

    router.push(pathname);
  };

  return (
    <aside className="catalogue-filters rounded-lg border border-surface-border bg-surface-base p-4 lg:sticky lg:top-24">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl">Filters</h2>
        <button className="text-sm font-semibold text-brand-primary" type="button" onClick={clear}>
          Clear
        </button>
      </div>
      <div className="mt-5 grid gap-5 text-sm">
        <div>
          <h3 className="font-semibold">Category</h3>
          <div className="mt-3 grid gap-2">
            {/* Categories load separately from the product list, so this block degrades on its
                own. A failure here must not block the grid: browsing by URL still works
                without the sidebar, so the category list is simply omitted rather than
                escalated into a page-level error. */}
            {isLoading || !mounted ? (
              <>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-28" />
              </>
            ) : isError ? (
              <p className="text-xs text-text-muted">Categories are unavailable right now.</p>
            ) : (
              categories?.map((category) => (
                <button
                  key={category.slug}
                  className={cn(
                    'filter-choice text-left',
                    active.category === category.slug
                      ? 'font-semibold text-brand-primary'
                      : 'text-text-secondary'
                  )}
                  type="button"
                  aria-pressed={active.category === category.slug}
                  onClick={() =>
                    commit({ category: active.category === category.slug ? undefined : category.slug })
                  }
                >
                  {category.name}
                </button>
              ))
            )}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Trust</h3>
          <button
            className={cn(
              'mt-3 flex w-full items-center justify-between rounded-md p-3 text-left font-semibold',
              active.labVerified ? 'bg-brand-primary text-white' : 'bg-brand-light text-brand-primary'
            )}
            type="button"
            aria-pressed={Boolean(active.labVerified)}
            onClick={() => commit({ labVerified: active.labVerified ? undefined : true })}
          >
            Lab Verified Only
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div>
          <h3 className="font-semibold">Sort</h3>
          <div className="mt-3 grid gap-2 text-text-secondary">
            {SORT_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                className={cn(
                  'filter-choice text-left',
                  active.sort === value ? 'font-semibold text-brand-primary' : undefined
                )}
                type="button"
                aria-pressed={active.sort === value}
                onClick={() => commit({ sort: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ProductListingScreen({
  title = 'Shop the collection',
  filters,
}: {
  title?: string;
  filters: ProductFilterState;
}) {
  const [page, setPage] = useState(filters.page ?? 1);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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
    <div className="customer-page">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-sm text-text-secondary">
        <Link className="hover:underline" href="/">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">{title}</span>
      </nav>
      <div className="customer-page-intro flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="home-kicker">the truzov marketplace</span>
          <h1 className="customer-page-title mt-2">{title}</h1>
          {/* `total` is the full server-side count, not `items.length` — the latter would read
              "Showing 24 products" on a catalogue of 500. */}
          <p className="mt-1 text-text-secondary">
            {isLoading ? 'Loading products...' : `Showing ${items.length} of ${total} products`}
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-primary bg-white px-4 text-sm font-medium text-brand-primary lg:hidden"
          type="button"
          onClick={() => setFilterSheetOpen(true)}
        >
          Filters
          {activeFilters.length ? (
            <Badge variant="info">{activeFilters.length}</Badge>
          ) : null}
        </button>
      </div>
      {activeFilters.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="info">
              {key}: {value}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <FilterPanel filters={filters} />
        </div>
        <div className="catalogue-results min-w-0">
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

      <MobileFilterSheet
        filters={filters}
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        renderControls={(draft, setDraft) => (
          <FilterPanel draft={draft} filters={filters} onDraftChange={setDraft} />
        )}
      />
    </div>
  );
}

export function SearchScreen({ query }: { query?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(query ?? '');

  const trimmed = query?.trim();

  if (!trimmed) {
    return (
      <div className="customer-page max-w-3xl">
        <div className="customer-page-intro">
          <span className="home-kicker">find your next favourite</span>
          <h1 className="customer-page-title mt-2">Search the marketplace</h1>
          <p>Explore products, brands, and categories.</p>
        </div>
        <form
          aria-label="Search catalogue"
          role="search"
          className="flex min-h-12 overflow-hidden rounded-lg border border-outline-variant bg-white"
          onSubmit={(event) => {
            event.preventDefault();
            const next = draft.trim();
            if (next) {
              router.push(`/search?q=${encodeURIComponent(next)}`);
            }
          }}
        >
          <input
            aria-label="Search products"
            autoFocus
            className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-on-surface outline-none placeholder:text-outline"
            placeholder="Search verified products, brands, categories..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button aria-label="Search" className="h-full w-16 rounded-none" size="icon" type="submit">
            <Search aria-hidden="true" className="h-5 w-5" />
          </Button>
        </form>

        <div className="mt-10">
          <EmptyState
            action="Browse Products"
            href="/products"
            icon={Search}
            message="Search for a product name, brand, or category to see results."
            title="Search verified products"
          />
        </div>
      </div>
    );
  }

  return (
    <ProductListingScreen
      filters={{ query, sort: 'relevance' }}
      title={`Search results for "${query}"`}
    />
  );
}

const accountNavSections = [
  {
    label: 'OVERVIEW',
    items: [{ label: 'Profile', href: '/account', icon: CircleUserRound }],
  },
  {
    label: 'ORDERS',
    items: [{ label: 'Orders & Returns', href: '/account/orders', icon: ReceiptText }],
  },
  {
    label: 'MANAGE',
    items: [
      { label: 'Addresses', href: '/account/addresses', icon: MapPin },
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
    <section className="account-panel rounded-2xl border border-[#dce6d8] bg-white p-5 shadow-[0_8px_28px_#04342c0a] sm:p-7 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-xl font-medium text-[#04342c] sm:text-2xl">{title}</h2>
        {titleAction}
      </div>
      <hr className="mt-5 border-[#dce6d8]" />
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function AccountSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const signOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="account-sidebar h-fit min-w-0 rounded-2xl border border-[#dce6d8] bg-white p-4 shadow-[0_8px_28px_#04342c0a] lg:sticky lg:top-24">
      <div className="border-b border-[#dce6d8] px-2 pb-5 pt-2">
        <p className="text-xs font-medium uppercase tracking-[0.17em] text-[#346b54]">your space</p>
        <p className="mt-2 break-words text-xl font-medium text-[#04342c]">{userName}</p>
        <p className="mt-2 text-base leading-relaxed text-[#547064]">Manage your profile, orders, and addresses.</p>
      </div>
      <nav aria-label="Account pages" className="mt-4 flex flex-wrap gap-2 lg:mt-5 lg:grid lg:gap-5">
        {accountNavSections.map((section) => (
          <div className="shrink-0" key={section.label}>
            <p className="hidden px-2 text-xs font-medium uppercase tracking-[0.17em] text-[#547064] lg:block">
              {section.label}
            </p>
            <ul className="flex gap-2 lg:mt-3 lg:grid lg:gap-1">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/account' && pathname.startsWith(`${item.href}/`));

                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-sm transition-colors ${
                        active
                          ? 'bg-[#eaf3de] font-medium text-[#04342c]'
                          : 'text-[#476158] hover:bg-[#f2f5ec] hover:text-[#04342c]'
                      }`}
                    >
                      <item.icon aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 text-[#346b54]" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <button
        className="mt-5 flex min-h-11 w-full items-center gap-2 rounded-lg border-t border-[#dce6d8] px-2 pt-4 text-left text-sm text-[#b44d30] transition-colors hover:bg-[#fae8e0] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={loggingOut}
        onClick={signOut}
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
        {loggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </aside>
  );
}

export function AccountScreen() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const isSaving = useAuthStore((state) => state.isLoading);
  const saveError = useAuthStore((state) => state.error);
  const [editing, setEditing] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  /**
   * Only the fields `PATCH /users/me` accepts. Phone is NOT among them anymore: a changed
   * phone is an unverified write to the one identifier checkout gates on, so it moves only
   * through the OTP flow in PhoneChangeModal (spec §6).
   *
   * Gender, date of birth and location used to be here. No product DTO or request body has a
   * home for them, so they were removed rather than left as inputs that accept typing and throw
   * it away on save — which is what the previous local-only `updateProfile` did (plan §6.1).
   * `avatarUrl` is accepted by the endpoint but there is no upload flow, so it is not exposed.
   */
  const [form, setForm] = useState({ name: '', email: '' });

  function startEdit() {
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
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
      });
      setEditing(false);
    } catch {
      // Kept in edit mode on failure so the user's input is not lost. The message is rendered
      // from the store below.
    }
  }

  const profileRows = [
    { label: 'Full name', value: user?.name || '—' },
    {
      label: 'Mobile number',
      value: user?.phone || '— not added —',
      // Surfaced because it is not cosmetic: an unverified phone blocks checkout with a
      // 403 PHONE_NOT_VERIFIED, so the user needs to see it before they hit that wall.
      verified: user?.phone ? user.phoneVerified : undefined,
    },
    { label: 'Email address', value: user?.email || '— not added —', verified: user?.email ? user.emailVerified : undefined },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <AccountPanel title="Profile details">
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
            <div className="grid gap-1">
              <span className="text-sm font-medium text-text-primary">Mobile Number</span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">
                  {user?.phone || '— not added —'}
                </span>
                <Button
                  className="min-h-11"
                  variant="outline"
                  onClick={() => setPhoneModalOpen(true)}
                >
                  Change
                </Button>
              </div>
              <p className="text-xs text-text-secondary">
                Changing your number requires a code sent to the new one, so it stays verified.
              </p>
            </div>
            {/* Changing the email clears its verification server-side, so the user is told
                before they save rather than discovering it at checkout. */}
            <p className="text-xs text-text-secondary">
              Changing your email means it has to be verified again.
            </p>
            {saveError ? (
              <p className="rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger">
                {saveError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className="min-h-11 px-7 font-medium normal-case tracking-normal"
                disabled={isSaving}
                loading={isSaving}
                variant="primary"
                onClick={() => void saveEdit()}
              >
                save changes
              </Button>
              <Button
                className="min-h-11 px-7 font-medium normal-case tracking-normal"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <dl className="grid">
              {profileRows.map(({ label, value, verified }) => (
                <div key={label} className="grid gap-1 border-b border-[#e6ece2] py-4 last:border-b-0 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-start sm:gap-4">
                  <dt className="text-sm text-[#547064]">{label}</dt>
                  <dd className="flex min-w-0 flex-wrap items-center gap-2 break-all text-sm font-medium text-[#04342c]">
                    {value}
                    {verified === true ? <Badge variant="success">Verified</Badge> : null}
                    {verified === false ? <Badge variant="info">Not verified</Badge> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6">
              <Button
                className="min-h-11 px-7 font-medium normal-case tracking-normal"
                variant="primary"
                onClick={startEdit}
              >
                edit details
              </Button>
            </div>
          </>
        )}
      </AccountPanel>
      <PhoneChangeModal open={phoneModalOpen} onClose={() => setPhoneModalOpen(false)} />
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
            {Boolean(order.discountAmount) && <div className="flex justify-between text-text-success"><span>Coupon ({order.couponCode})</span><span>−{formatCurrency(order.discountAmount ?? 0)}</span></div>}
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
  const [editing, setEditing] = useState<AddressDto | undefined>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (address: AddressDto) => {
    setEditing(address);
    setModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <AccountPanel
        title="Saved Addresses"
        titleAction={
          <Button variant="outline" onClick={openCreate}>
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

                {/* PATCH /users/me/addresses/{id} — owner-checked server-side. A past order is
                    unaffected: it snapshotted the address it shipped to. */}
                <div className="mt-4 flex items-center gap-3 border-t border-surface-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(address)}>
                    <Pencil aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-5 rounded-2xl border border-dashed border-surface-border bg-surface-raised/50 p-4 text-sm text-text-secondary">
          Editing an address does not change past orders — each order keeps the address it was
          placed with.
        </p>

        <AddressFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          address={editing}
        />
      </AccountPanel>
    </div>
  );
}

export function SettingsScreen() {
  const { user } = useAuthStore();

  const settingsRows = [
    { label: 'Login email', value: user?.email ?? 'Not set' },
    { label: 'Mobile number', value: user?.phone ?? 'Not added' },
    { label: 'Language', value: 'English (India)' },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <AccountPanel title="Account settings">
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
          You can update your name, email, and mobile number in your <Link className="font-medium text-brand-primary underline underline-offset-4" href="/account">profile details</Link>.
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

  return (
    <div className="customer-page min-h-[55vh]">
      <div className="customer-page-intro flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="home-kicker inline-flex items-center gap-2"><Heart aria-hidden="true" size={16} /> saved for later</span>
          <h1 className="customer-page-title mt-2">Your wishlist</h1>
          <p className="mt-2 text-text-secondary">{items.length ? `${items.length} saved ${items.length === 1 ? 'product' : 'products'}, all in one place.` : 'Keep the products you love close at hand.'}</p>
        </div>
        <Link className="home-see-all min-h-11 content-center" href="/products">continue shopping</Link>
      </div>
      {isError ? (
        <ErrorState error={error} title="We could not load your wishlist" onRetry={() => void refetch()} />
      ) : isLoading || productsQuery.isLoading ? (
        <ProductGrid loading products={[]} skeletonCount={items.length || 4} />
      ) : !items.length ? (
        <EmptyState action="Browse products" href="/products" icon={Heart} message="Save products with the heart icon and find them here." title="Your wishlist is empty" />
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
    <div className="customer-page">
      <h1 className="customer-page-title max-w-3xl">Verification before checkout confidence.</h1>
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
