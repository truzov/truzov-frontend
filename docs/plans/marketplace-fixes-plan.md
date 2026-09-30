# Marketplace Fixes — Implementation Plan

Source: `C:\Users\piyus\Downloads\marketplace-fixes-todo.md`
Written after read-only investigation of both repos. Cited line numbers were accurate at
time of writing but **verify by searching for the quoted string**, not by trusting the number.

## Repos

| Role | Path | Branch at plan time |
| --- | --- | --- |
| Frontend | `C:\Users\piyus\OneDrive\Desktop\zshivam` | `feat/google-signin-ui` |
| Backend | `C:\Users\piyus\OneDrive\Desktop\database 2` | `base-shrey-variants` |

Frontend talks to `http://localhost:8080/api/v1` (`.env.local`).

Stack: Next.js 15 App Router, TypeScript, Tailwind, zustand, TanStack Query, Vitest + Playwright.
Backend: Spring Boot 3.5, Java 21, Postgres, Flyway.

## Ground rules for implementation

- Follow `CLAUDE.md` in the frontend repo: minimum code, surgical changes, no speculative
  abstractions, match existing style.
- `components/screens/CustomerScreens.tsx` is 60 KB and exports nearly every customer screen.
  Items 1 and 2 both land there. Do them in the order below, not in parallel, to avoid conflicts.
- `ProductListingScreen` is shared by **three** routes: `/products`, `/search`,
  `/category/[slug]`. Any prop-signature change hits all three.
- Filter state is **URL-only** today. `CustomerScreens.tsx` imports `usePathname` but NOT
  `useRouter` or `useSearchParams`. There is no client-side filter state anywhere in the app.
- Run `npx tsc --noEmit`, `npm run lint`, and `npx vitest run` after each item.
  Relevant existing tests: `tests/utils.test.ts` (asserts the `parseFilters` URL contract),
  `e2e/critical-paths.spec.ts` (has a category-filter test and `test('search queries the server')`
  which does `page.goto('/search?q=ghee')`).

---

## Item 6 — Duplicate "Add Address" on checkout  ← DO THIS FIRST

Smallest, zero-risk, single file. Good warm-up that proves the toolchain works.

### Findings

Both CTAs live in `AddressScreen` in `components/checkout/CheckoutScreens.tsx` (screen declared
~line 308) and share one state: `const [modalOpen, setModalOpen] = useState(false)` (~line 317).

- **Button A**, top-right, `~354-357`: `<Button variant="outline" onClick={() => setModalOpen(true)}>`
  + `<Plus/>` + `Add New Address`. Sits in the header flex row (`flex flex-wrap items-start
  justify-between gap-3`, ~line 349), **outside** the `isLoading / isError / addresses.length === 0 /
  else` ternary chain that starts ~line 360. So it renders in all four states.
- **Button B**, centered, `~378-380`: `<Button className="mt-5" onClick={() => setModalOpen(true)}>`
  + `Add an address`, inside the `addresses.length === 0` branch (~line 371), in a hand-rolled
  dashed box with `<MapPin/>` and `<h2>No saved addresses</h2>`.

Both call the identical handler. Both open the same `<AddressFormModal open={modalOpen} .../>`
(~line 397) in create mode with the same title "Add New Address". Verdict: genuinely redundant,
in exactly one state (zero addresses). With ≥1 address only Button A renders. Screenshot confirms
both visible simultaneously.

The sibling screen already shows the intended pattern: `AddressesScreen` in
`CustomerScreens.tsx:~1102` has the same unconditional top-right action (~1124) and its empty
state does **not** duplicate it (`EmptyState` at ~1135-1142).

### Change

Keep the centered CTA as the primary affordance for the empty state (it is the discoverable
one on narrow screens) and suppress the header button **only** in that exact branch.

In `components/checkout/CheckoutScreens.tsx`, gate Button A on the empty-state condition being
false. Do **not** write a naive `addresses.length > 0 &&`.

Reason: `useAddresses()` (`hooks/api/useCommerce.ts:15`) returns the module-level
`EMPTY_ADDRESSES` fallback, so `addresses` is `[]` during `isLoading` **and** on `isError`.
A naive guard would hide the only add CTA on a fetch error, where the `ErrorState` branch
(~366-370) offers only `onRetry` — leaving the user with no way to add an address at all.

Correct guard: show Button A unless `!isLoading && !isError && addresses.length === 0`.

### Verify

- Zero addresses, loaded → exactly one CTA (centered "Add an address").
- One or more addresses → exactly one CTA (top-right "Add New Address").
- Loading skeleton and fetch-error states → top-right CTA still present and clickable.
- Creating the first address still preselects it (effect at ~328-332 must keep working).

---

## Item 3 — Bottom nav Account: guest vs logged-in

### Findings

`components/layout/MobileNav.tsx` (47 lines) is a static tab array with **zero** auth awareness.
It imports only `usePathname` and `cn`.

```tsx
// MobileNav.tsx:8-14
const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Categories', icon: Shapes },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account', label: 'Account', icon: UserRound },
];
```

`MobileNav.tsx:19-21` returns `null` on `/checkout*`. Line 24 is `lg:hidden` → small/medium only.
Mounted from `components/layout/ShopLayout.tsx:11`, and `app/(account)/layout.tsx` wraps the
account group in `ShopLayout`, so the bar is present on `/account`.

What a guest gets today when tapping Account: navigate to `/account` →
`components/account/AccountShell.tsx:9` calls `useProtectedRoute('/login')` →
`AccountShell.tsx:41-42` `if (!isLoggedIn) return null` (blank frame) →
`hooks/useProtectedRoute.ts:30-41` pushes `/login?redirect=/account` →
`app/(auth)/login/page.tsx` renders `<AuthModalRedirect mode="login"/>` →
`components/auth/AuthModalRedirect.tsx:41-42` calls `openAuthModal(...)` then
`router.replace('/')`. Net result: blank flash, then dumped on the **home page** with a modal.
Neither card in the spec exists anywhere in the codebase.

The desktop header already has the correct branch — reuse this pattern, do not invent one:

```tsx
// components/auth/AccountMenu.tsx:40-46
const handleAccountClick = () => {
  if (isLoggedIn) { setMenuOpen((open) => !open); return; }
  openAuth();   // -> openAuthModal({ mode: 'login' })
};
```

`AccountMenu.tsx:11` already owns the label the spec asks for:
`{ label: 'My Account', href: '/account', icon: UserRound }`.

### Primitives to use (exact names)

- `useAuthStore` from `@/store/auth.store` — `state.status`, `state.isLoggedIn`, `state.user`.
  `AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous'`.
- `useAuthModalStore` from `@/store/auth-modal.store` —
  `openAuthModal({ mode, redirectTo?, buyNow? })`.
- `useProtectedRoute` from `@/hooks/useProtectedRoute` — `{ isLoggedIn, isLoading }`.
- `EmptyState` (`components/ui/EmptyState.tsx`) — takes `icon`, `title`, `message`, `action`, and
  **exactly one** of `href` or `onAction`. `onAction` is the modal-friendly variant.
- `Skeleton`, `Button`, `cn`.

**Hydration is safe.** `store/auth.store.ts:150-157` documents that the store is deliberately
**not** wrapped in `persist`; initial state is `status: 'idle', isLoggedIn: false` on both server
and first client render. No `mounted` guard needed. The access token is memory-only and the session
is restored asynchronously by `AuthEventBridge` (`components/auth/AuthEventBridge.tsx:35-37`,
mounted once from `app/providers.tsx:64`).

**Modal is the documented flow, not routes.** `app/(auth)/login/page.tsx` and `signup/page.tsx`
contain no form — both only render `AuthModalRedirect`, whose docblock states auth is a popup, not
a page, and that those routes exist only so bookmarks and guard redirects keep working. `AuthModal`
is globally mounted at `app/providers.tsx:66`. So call `openAuthModal({ mode, redirectTo: '/account' })`
rather than `router.push('/login')`.

### Change

Two parts.

1. `components/layout/MobileNav.tsx` — make the Account tab auth-aware. Subscribe with **narrow
   selectors** (do not copy `AccountMenu.tsx:19`'s whole-store destructure). Keep the other four
   tabs untouched.
2. Own the two cards. `components/account/AccountShell.tsx:41-42` is the minimal correct seam —
   replace `return null` with a guest "Login / Signup" card whose action calls `openAuthModal`.

   **This requires relaxing `useProtectedRoute('/login')` in `AccountShell` for the `/account`
   index route only**, otherwise the card renders for one frame and is then raced off-screen by
   the redirect `useEffect`. Child routes `/account/orders`, `/account/addresses`,
   `/account/settings` **must stay guarded**.

Gate the card on `status`, not on `isLoggedIn` alone:
`status === 'idle' || status === 'restoring'` → `Skeleton`; `anonymous` → Login/Signup card;
`authenticated` → My Account card. Otherwise a returning user with a valid refresh token sees
"Login / Signup" for the duration of the `/auth/me` round trip on every hard reload.

For the logged-in "My Account" card, reuse `accountNavSections` (`CustomerScreens.tsx:~608`)
and/or `AccountSidebar` (`~647`) for the link list rather than hardcoding links.

### Verify

- Logged out, small screen: tap Account → "Login / Signup" card, no blank flash, no bounce to `/`.
- Logged in, small screen: tap Account → "My Account" card.
- Hard reload while logged in: skeleton, then My Account. Never a flash of Login/Signup.
- `/account/orders` etc. still redirect guests to login.
- Desktop (≥lg) unchanged — `MobileNav` is `lg:hidden`; `AccountMenu` untouched.
- `MobileNav.tsx:27` active-tab highlight uses `pathname.startsWith(tab.href)`; if the Account
  tab stops being a `<Link href="/account">`, confirm the highlight still behaves.

---

## Item 2 — Dedicated search UI on small/medium screens

### Findings

`app/(shop)/search/page.tsx` is 11 lines and renders
`<SearchScreen query={typeof params.q === 'string' ? params.q : undefined} />`.

`SearchScreen` (`CustomerScreens.tsx:599-606`) is a 7-line passthrough with no search UI:

```tsx
export function SearchScreen({ query }: { query?: string }) {
  return (
    <ProductListingScreen
      filters={{ query, sort: 'relevance' }}
      title={query ? `Search results for "${query}"` : 'Search verified products'}
    />
  );
}
```

So `/search` renders the identical DOM tree as `/products` — same breadcrumb, same mobile
"Filters" link, same desktop `FilterPanel`, same grid, same pagination. Only the `<h1>` differs.
`app/(shop)/search/loading.tsx` also reuses `ProductListingScreenSkeleton`, so even the loading
state is indistinguishable.

**Why it is a small/medium-screen bug specifically:** desktop only reaches `/search` via the
header form, which always appends `?q=` (`Header.tsx:94-97`). Mobile reaches it via the bottom-nav
tab, which points at **bare `/search`** with no query (`MobileNav.tsx:11`).

**The empty-query path silently degrades into `/products`:** `toProductListParams` collapses
blanks (`lib/utils/filters.ts:84`, `q: filters.query?.trim() || undefined`), then
`useProductList` computes `isSearch = Boolean(query)` → false → calls `listProducts()` on
`/products`. `lib/api/endpoints/catalog.ts:76-78` documents that `/search` requires `q` (omitting
it is a 422 `INVALID_REQUEST`); the frontend dodges the 422 by falling back to `listProducts` —
which is precisely the reported bug.

There is also **no search input on `/search` itself** — zero way to enter a query from the page.

`Header.tsx:94-97` pushes `/search?q=${encodeURIComponent(query)}` with no trim and no blank
guard, so an empty submit yields `/search?q=` → `''` → `undefined` → full product list.

**Search API surface** (`lib/api/endpoints/catalog.ts`):

| Function | Endpoint | Wired? |
| --- | --- | --- |
| `searchProducts` (~79-88) | `GET /search` | Yes, via `useProductList` when `q` non-empty |
| `getSearchSuggestions` (~142-150) | `GET /search/suggestions` | **No — zero callers** |
| `listProducts` (~63-71) | `GET /products` | Yes — the fallback `/search` wrongly hits |

Typeahead is a complete vertical slice with no consumer: `getSearchSuggestions`,
`SearchSuggestionsDto` (`types/api.ts:315`), `queryKeys.searchSuggestions` (`lib/api/queries.ts:29`).
`MIGRATION_SUMMARY.md:411` says so explicitly. There is no hook in `hooks/api/useCatalog.ts`.

### Change

Give `SearchScreen` a real body. Change **`SearchScreen` only** — do not touch
`ProductListingScreen`, or the new input leaks onto `/products` and `/category/[slug]`.

1. Render an on-page search input (reuse `components/ui/Input.tsx`), seeded from `query`, that
   pushes `/search?q=...` on submit. Trim and ignore blank submits.
2. Add an explicit **no-query state** instead of rendering an unfiltered product grid. Use
   `EmptyState` with `icon={Search}` — there is already a precedent at `CustomerScreens.tsx:584-591`.
   Wording should prompt for input, not show the catalogue.
3. When `query` is non-empty, keep delegating to `ProductListingScreen` exactly as today so
   `e2e/critical-paths.spec.ts` `/search?q=ghee` keeps passing.
4. Also guard the blank submit in `components/layout/Header.tsx:94-97`.

**Out of scope unless confirmed** (see Open Questions): wiring `getSearchSuggestions` typeahead,
and making `/search` honour the full filter set.

### Verify

- `/search` with no query → dedicated search UI with an input and a prompt. **Not** a product grid.
- `/search?q=ghee` → results, unchanged from today. E2E test passes.
- Mobile bottom-nav Search tab → the prompt state, visibly different from `/products`.
- Empty header submit → no navigation, or navigation to the prompt state. Never the full catalogue.
- `/products` and `/category/[slug]` pixel-unchanged.
- If `/search` stops being a product grid when `q` is absent, revisit
  `app/(shop)/search/loading.tsx` — its skeleton will no longer match the loaded layout.

---

## Item 1 — Mobile filter panel with explicit Apply  ← LARGEST ITEM

### Findings

The mobile "Filters" control is **not a button**. It is a `<Link>` hardcoded to one filter value:

```tsx
// CustomerScreens.tsx:~520-526
<Link
  className="inline-flex h-10 items-center rounded-md border border-brand-primary px-4 text-sm font-semibold text-brand-primary lg:hidden"
  href="/products?labVerified=true"
>
  Filters
</Link>
```

Tapping it (1) applies `labVerified=true` immediately, (2) discards every other active filter
because the href is an absolute path with a single param, and (3) navigates away from `/search`
or `/category/[slug]` onto `/products`. `lg:hidden` makes it the **only** filter affordance below
1024px — phones and tablets.

Desktop uses a different element gated the opposite way:

```tsx
// CustomerScreens.tsx:~537-540
<div className="grid gap-6 lg:grid-cols-[260px_1fr]">
  <div className="hidden lg:block">
    <FilterPanel filters={filters} />
```

`FilterPanel` (`~402-468`) is 100% `<Link>`-driven — no form, no local state, no Apply button, so
it has no draft concept to reuse. It also carries pre-existing bugs worth knowing about:

- `~409-411` Clear → `<Link href="/products">`
- `~438-441` category → `href={`/products?category=${category.slug}`}` — absolute, wipes all other params
- `~450-452` Lab Verified → `href="/products?labVerified=true"` — absolute, wipes all other params
- `~458-462` sort → relative `href="?sort=price_asc"` — in Next.js this **replaces the whole query
  string**, so sorting silently drops `category`, `labVerified`, `tags`, and `q`

No price / tag / brand / inStock controls exist in any component, although `ProductFilterState`
(`lib/utils/filters.ts:19-31`) and `activeFilterEntries` already support them.

**State flow.** URL-only, resolved server-side:
`app/(shop)/products/page.tsx:~22` `filters={parseFilters(toSearchParams(params))}` →
`lib/utils/filters.ts:41-57` `parseFilters` (booleans are tri-state:
`params.get('inStock') === 'true' ? true : undefined`) →
`CustomerScreens.tsx:482-487` `toProductListParams(filters, { page, limit })` inside `useMemo` →
`lib/utils/filters.ts:70-88` (the **only** place rupees become paise via `rupeesToPaise`, and the
only place an unknown `?sort=` is dropped via `normaliseSort`) →
`hooks/api/useCatalog.ts` `useProductList` → `searchProducts`/`listProducts` →
`lib/api/endpoints/catalog.ts` `toQuery()` clamps page/limit and slices `tags` to 20.

Only local state in the screen is pagination: `useState(filters.page ?? 1)` at `~477`, reset to 1
whenever `filterIdentity` changes (`~492-499`).

`toSearchParams` is currently a **private helper inside `app/(shop)/products/page.tsx:~29-43`**.

**The data path needs no changes** — `toProductListParams` already handles every field.

### Primitives available

- `components/ui/Modal.tsx` — `{ open, title, children, onClose }`, `role="dialog"`,
  `aria-modal="true"`, wires `useFocusTrap`, returns `null` when closed. But it is **centered
  only**: `fixed inset-0 z-50 grid place-items-center bg-black/40 p-4` with panel `w-full max-w-lg`.
  No bottom-anchored variant.
- `hooks/useFocusTrap.ts` — `useFocusTrap(ref, enabled, onEscape)`: focus on open, focus restore
  on close, Escape, Tab/Shift-Tab cycling. Fully reusable.
- `activeFilterEntries` (`lib/utils/filters.ts:~114-127`) — already renders the active-filter chips
  at `CustomerScreens.tsx:~528-536`; reuse for an "N filters active" badge on the trigger.
- `useCategories()` — already called inside `FilterPanel` with a 10-minute `staleTime`, so a sheet
  reusing it costs no extra request.
- `Button`, `Badge`, `Input`, `EmptyState`, `Skeleton`.
- **No drawer / bottom-sheet / Sheet component exists anywhere in `components/`.**

Reference markup for the intended UX already in the repo:
`stitch_designs__truzov/m_filters_truzov/code.html` and
`stitch_designs__truzov/m_plp_honey_truzov_updated_nav_filters/code.html`.

### Change

1. Replace the `<Link>` at `~520-526` with a real `<button>` that opens a panel. Keep `lg:hidden`.
   Show an active-filter count from `activeFilterEntries`.
2. Add a bottom-sheet presentation. Either add a `placement` / size variant to
   `components/ui/Modal.tsx` (preferred — reuses `useFocusTrap` and the a11y wiring) or add a
   sibling component next to it. Do not hand-roll a third dialog; there are already two
   (`Modal.tsx` and `components/auth/AuthModal.tsx:56-59`).
3. Inside the sheet, hold **draft** filter state in `useState`, seeded from the `filters` prop.
   Selecting options mutates the draft only. An explicit **Apply** button commits; **Clear**
   resets the draft. This is the app's first client-side filter state.
4. Commit by writing the URL. The screen currently has no `useRouter` — add it, or lift the commit
   into a small child component. Build the target query string from the **full** draft so no param
   is silently dropped. A `filtersToSearchParams` serializer belongs in `lib/utils/filters.ts`
   next to `parseFilters`; `toSearchParams` should be promoted out of `products/page.tsx` at the
   same time if Item 2 also needs it.
5. Preserve the current route. Commit to `pathname` + new query, not a hardcoded `/products`, so
   the sheet works on `/search` and `/category/[slug]`.

Scope the controls to what `FilterPanel` exposes today (category, labVerified, sort). Adding
price inputs introduces the rupees↔paise contract (`lib/utils/filters.ts:~90-96`) to the UI for
the first time — leave it out unless asked.

### Verify

- Small screen: tapping "Filters" opens a panel and changes **nothing** until Apply.
- Selecting category + labVerified + sort, then Apply → all three land in the URL together, other
  params preserved, results update, page resets to 1.
- Cancel / backdrop / Escape → no filter change.
- The sheet works on `/products`, `/search` (query preserved), and `/category/[slug]`.
- Focus trap: focus moves in on open, cycles with Tab, restores on close. Escape closes.
- Desktop ≥lg: `FilterPanel` sidebar behaves exactly as before, including `lg:sticky lg:top-36`
  which is coupled to the `lg:grid-cols-[260px_1fr]` parent — do not move `FilterPanel` out of its
  `hidden lg:block` wrapper.
- `npx vitest run tests/utils.test.ts` passes (the `parseFilters` contract).
- `e2e/critical-paths.spec.ts` category-filter test passes.
- **Do not** let a new object identity per render reach `filterIdentity` (`~492-499`) or the
  `useEffect` will thrash `setPage(1)` and break pagination.

---

## Item 4 — Multi-image products + lightbox

### Findings: the backend is already complete. No backend work needed.

DB, in **both** `src/main/resources/schema.sql:156-164` and
`src/main/resources/db/migration/V202607200000__baseline.sql:~166`:

```sql
CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt VARCHAR(300),
  blur_data_url TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images(product_id, sort_order);
```

- `infrastructure/persistence/entity/ProductImageEntity.java` — `@Table(name = "product_images")`.
- `entity/ProductEntity.java:139-142` — `@OneToMany(fetch = LAZY) @JoinColumn(name="product_id")
  @OrderBy("sortOrder ASC") private List<ProductImageEntity> images`.
- `repository/ProductRepository.java:32` — `@EntityGraph(attributePaths = {"images"})` on
  `findPublishedBySlugOrId`, so images are join-fetched with no N+1.
- The API returns a **list**: `dto/response/ProductDetailDto.java:36` and
  `ProductSummaryDto.java:31` both carry `List<ProductImageDto> images`.
  `ProductImageDto` is `record (String id, String url, String alt, String blurDataUrl, int sortOrder)`.
  Mapped at `mapper/ProductMapper.java:43` (summary) and `:84` (detail).
- **JSON field name: `images`** — array of `{id, url, alt, blurDataUrl, sortOrder}`, sorted by
  `sortOrder` ASC. Present on list, search, home, and detail payloads.
- Only place a single image is collapsed: `application/search/SearchService.java:91`, for the
  suggestions endpoint only.

Seed data, `src/main/resources/db/seed/data.sql:97-102`:

| Slug | Images |
| --- | --- |
| `raw-forest-honey-500g` | **2** (`img_honey_1` sort 0, `img_honey_2` sort 1) |
| `a2-cow-ghee-1l` | 1 |
| `cold-pressed-coconut-oil-1l` | 1 |

`blur_data_url` is never seeded (column omitted from the INSERT column list).

Frontend already models the array and already renders a thumbnail strip:

- `types/api.ts:193-198` `ProductImageDto { id?, url, alt?, sortOrder? }`; `:266`
  `images: ProductImageDto[]`. **`blurDataUrl` is not modelled.**
- `lib/utils/product.ts` — `displayImages()` at `:26-41` (tolerates `string | ProductImageDto`,
  falls back alt→product.name) and `primaryImage()` at `:50-52`.
- `components/screens/ProductDetailScreen.tsx` — `:60` `selectedImageIndex` state,
  `:75-78` `gallery = useMemo(() => displayImages(...))`, `:112` `selectedImage`,
  `:142-156` main `<Image>`, `:161-180` thumbnail strip gated on `gallery.length > 1`.
- `components/product/ProductCard.tsx:15,48,101-112` — `primaryImage(product)`, single image
  wrapped in `<Link href={`/products/${slug}`}>`.

### What is actually missing

1. **No lightbox anywhere** — grep for `[Ll]ightbox` across the frontend returns 0 matches.
2. The main image (`ProductDetailScreen.tsx:142-156`) is a plain `<div>` + `<Image>` — no
   `onClick`, no button wrapper, no keyboard affordance.
3. `gallery.slice(0, 4)` at `~163` hard-caps thumbnails at 4, so a 5+ image product cannot be
   fully browsed today.
4. `Modal.tsx` is `max-w-lg` with a visible title bar and `p-6` — no full-bleed variant, no
   arrow-key prev/next, no swipe. `useFocusTrap` handles Escape only, not Left/Right.
5. `blurDataUrl` is served by the API but absent from the frontend type, so
   `next/image placeholder="blur"` is unavailable.

### Change

Frontend only.

1. New lightbox component under `components/product/` (e.g. `ProductImageLightbox.tsx`). Host it
   in `Modal.tsx` if a full-bleed variant is added, else standalone reusing `useFocusTrap`.
2. Make the main image in `ProductDetailScreen.tsx` an accessible trigger — a real `<button>` with
   an aria-label, not a `div` with onClick — opening the lightbox at the current
   `selectedImageIndex`.
3. In the lightbox: prev/next controls, index indicator (e.g. "2 / 5"), Left/Right arrow keys,
   Escape to close, focus trap, and a thumbnail rail. Extend `useFocusTrap` for arrow keys or
   handle them locally in the lightbox.
4. Raise or remove the `slice(0, 4)` thumbnail cap so every image is reachable. Note the
   `grid-cols-4` layout at `~163` will need adjusting (scroll rail or wrap).
5. **Seed a proof-of-concept product with more than 2 images.** The todo says 1 product is enough.
   `raw-forest-honey-500g` already has 2 — extend it to 4–5 by adding rows to
   `src/main/resources/db/seed/data.sql` (keep `ON CONFLICT DO NOTHING`, use the existing
   `img_honey_*` id convention and sequential `sort_order`), then re-run the seed:
   `psql -U truzov -d truzov -f src/main/resources/db/seed/data.sql`.
6. Optional: add `blurDataUrl` to `ProductImageDto` in `types/api.ts` to enable blur placeholders.

**No migration. Neither `schema.sql` nor the Flyway baseline needs editing.**

### Verify

- On `raw-forest-honey-500g`: clicking the main image opens the lightbox at the right index.
- Prev/next and arrow keys cycle all images; the counter is correct at both ends.
- Escape and the close button both dismiss; focus returns to the trigger.
- Every seeded image is reachable from the thumbnail rail (test with 5+).
- Single-image products: either no lightbox or a lightbox with navigation disabled — decide and
  keep it consistent. Today the thumbnail strip is hidden when `gallery.length <= 1`.
- **Image hosts:** `next.config.ts:4-13` allow-lists only `placehold.co` and
  `images.unsplash.com`. Any new seed URL outside those hosts throws in `next/image`. Use an
  allow-listed host for the new seed rows, or add the host to the config.
- Product cards still navigate to the PDP; no card-level lightbox.

---

## Item 5 — OTP: check account existence first  ← BLOCKED, NEEDS DECISIONS

### Blocking finding

**The checked-out backend branch has no auth module.** Verified directly:

```
$ git rev-parse --abbrev-ref HEAD
base-shrey-variants
$ git ls-files | Select-String "auth" -CaseSensitive:$false
docs/truzov-no-auth.postman_collection.json
```

Zero Java auth files. `AuthController.java` is absent on `base-shrey-variants`, `dev-utsav`,
`origin/main`, and `origin/dev`; it is present on `verify/full-stack`,
`sync/dev-with-shrey-v2`, `feat/13-google-oauth`, and `feat/auth-module`.

Worse, `git status` shows **`M src/main/resources/application.yml` uncommitted, already containing
the full auth config** — so the working tree and its config are not a compilable pair. All backend
quotes below are read from `verify/full-stack`.

**The backend work for this item cannot land on the currently checked-out branch.** A target
branch must be chosen first.

### Findings: current behaviour

**Frontend login submit is a single call with no pre-check:**

1. `components/auth/LoginForm.tsx:89` → `await sendOtp(data.identifier, 'login');`
   (the only network call in the OTP path; nothing precedes it)
2. `store/auth.store.ts:231-251` → `:236` normalises (strips non-digits unless the value contains
   `@`), `:238` `await sendOtpRequest({ identifier: normalised, purpose })`
3. `lib/api/endpoints/auth.ts:41` → `POST /api/v1/auth/otp/send`
4. `LoginForm.tsx:91-96` → `onOtpSent(identifier)` or `openOtpModal(...)`

**Backend auth endpoints** (`interfaces/rest/controller/AuthController.java`,
`@RequestMapping("/api/v1/auth")`):

| Path | Request | Response |
| --- | --- | --- |
| POST /signup | SignupRequest | ApiResponse\<SignupResponse\> (201) |
| POST /otp/send | OtpSendRequest | ApiResponse\<OtpSendResponse\> |
| POST /otp/verify | OtpVerifyRequest | ApiResponse\<TokenResponse\> |
| POST /login | LoginRequest | ApiResponse\<TokenResponse\> |
| POST /refresh | RefreshRequest | ApiResponse\<TokenResponse\> |
| GET /me | @AuthenticationPrincipal Jwt | ApiResponse\<UserProfileDto\> |
| POST /logout | LogoutRequest (optional) | 204 |

Plus `POST /auth/oauth/google` on `feat/13-google-oauth`, consumed at
`lib/api/endpoints/auth.ts:87`.

**No existence-check endpoint exists.** `UserRepository.existsByEmailOrPhone` is used internally
only, at `AuthService.java:135`, for the signup 409 conflict. No mapping exposes it.

**What `otp/send` does for an unknown identifier: writes an ownerless row, returns 200, dispatches
nothing. It does not create a user and does not error.** `application/auth/AuthService.java:166-200`:

```java
@Transactional
public OtpSendResponse sendOtp(OtpSendRequest request) {
    ...
    accountRateLimiter.checkAndConsume(identifier);   // charged BEFORE lookup, deliberately
    requireDeliverable(channel);                      // checked BEFORE lookup, deliberately
    Optional<UserEntity> user = channel == OtpChannel.EMAIL
            ? users.findByEmailIgnoreCaseAndDeletedAtIsNull(normaliseEmail(identifier))
            : users.findByPhoneAndDeletedAtIsNull(identifier);
    // One code path for both outcomes, with a null userId when nothing matched.
    OtpService.OtpSession session = otpService.issue(user.map(UserEntity::getId).orElse(null), ...);
```

Rejection is deferred to `verifyOtp`:

```java
if (consumed.getUserId() == null) {
    // A session with no owner cannot authenticate anyone. ... the 410 is the
    // same one an expired or already-used real session produces — which is
    // the point: the two cases must not be tellable apart.
    throw new OtpSessionExpiredException();
}
```

`OtpSendRequest` javadoc: the identifier is deliberately not format-validated so known and unknown
behave identically. `OtpSendResponse` javadoc: "Returned unchanged whether or not the identifier
matched an account."

**This is a deliberate anti-enumeration design (control H-3 at `AuthService.java:190-200`), not an
oversight.** `AuthService.java:39` — "Never confirm whether an account exists".
`lib/api/endpoints/auth.ts:33-38` — "must never say 'no account found'".
`LoginForm.tsx:164-167` carries matching neutral copy.

**The frontend already has a dead branch for this.** `git grep "ACCOUNT_NOT_FOUND"` in backend
`src/main/java` returns **zero matches** — the real response for an unknown identifier is
**410 OTP_EXPIRED**. So these frontend paths never fire:
`components/auth/AuthForm.tsx:60-67` (`accountNotFound` → `onModeChange?.('signup')`),
`components/auth/OTPVerification.tsx:72`, the signup-voucher path in `store/auth.store.ts:254+`,
and `lib/api/errors.ts:28`. `OTPVerification.tsx:213-221` documents this and is exactly why that
screen offers both "send a new code" and a signup link — it cannot tell the cases apart.

### Security implications — read before implementing

An existence-check endpoint is a **user-enumeration oracle** and removes control H-3. It enables
credential stuffing target lists, targeted phishing, and SIM-swap targeting of confirmed numbers.

Rate limiting that exists today:

- `interfaces/rest/filter/AuthRateLimitFilter.java` — per-IP, with a hardcoded
  `LIMITED_PATHS = Set.of("/api/v1/auth/signup", "/api/v1/auth/otp/send",
  "/api/v1/auth/otp/verify", "/api/v1/auth/login", "/api/v1/auth/refresh")`.
  **A new path is NOT rate limited until explicitly added to this set.**
- `application.yml:240-253` — `truzov.auth.rate-limit.enabled: true`, `requests: 5`,
  `window-minutes: 15`, `max-tracked-keys: 10000`.
- `application/auth/AuthAccountRateLimiter.java:48-50` — per-account, charged **before** the lookup
  so throttling is not itself an enumeration signal.
- `interfaces/rest/filter/RateLimitFilter.java` — buckets are **in-memory per-JVM**, documented in
  both the class javadoc and the README. 5 requests / 15 min per IP is defeated by rotating
  proxies regardless of replica count.

### Two implementation options

**Option A — new pre-check endpoint (what the todo literally asks for).**
`POST /api/v1/auth/account/exists` returning a boolean. `LoginForm.onSubmit` calls it before
`sendOtp` and routes to signup when false.

Backend files (on an auth-bearing branch): `AuthController.java` (new mapping), new request +
response DTOs under `interfaces/rest/dto/{request,response}/`, `AuthService.java` (lookup method),
`AuthRateLimitFilter.java` (**add the new path to `LIMITED_PATHS`**), `SecurityConfig.java`
(permit the public path), `AuthAccountRateLimiter.java` (per-account throttle),
`shared/exception/ErrorCode.java` if a new code is needed.

Frontend files: `lib/api/endpoints/auth.ts`, `types/api.ts`, `store/auth.store.ts`,
`components/auth/LoginForm.tsx` (branch before line 89), `components/auth/AuthForm.tsx`,
`components/auth/OTPVerification.tsx`, `lib/api/errors.ts`, `tests/auth-security.test.ts`.

Cost: a permanent public enumeration oracle. Also requires rewriting the neutral copy at
`LoginForm.tsx:164-167`, since the UI now does say "no account found".

**Option B — make the existing dead path real.** Keep `otp/send` neutral. Have `otp/verify`
return a distinguishable `ACCOUNT_NOT_FOUND` for the ownerless-session case instead of the
current 410, which activates the frontend branches that are **already written** at
`AuthForm.tsx:60-67` and hands the user to signup after verification.

Cost: does not satisfy the literal wording of the todo — the OTP is still sent first, so the user
spends one code before being told to sign up. Much smaller diff, no new endpoint, enumeration
surface narrowed to someone who already controls the phone/email (a far weaker oracle).

**No DB or schema change either way.** `users(email, phone)` is already present and indexed —
`schema.sql:27-42`, `phone VARCHAR(20) UNIQUE` at `:30`, `idx_users_phone` at `:42`, mirrored in
the Flyway baseline. The check is one indexed read.

Whichever option is chosen, **the dead `ACCOUNT_NOT_FOUND` path must be reconciled or removed** —
leaving it contradicts the new UI.

### Verify (once a decision is made)

- Unknown phone and unknown email → routed to signup, and **no OTP is dispatched** (check the
  provider log / `dev-backend.out.log`).
- Known phone and known email → OTP arrives, verify succeeds, tokens issue. **Existing login must
  still work end-to-end** (explicitly called out in the todo notes).
- The new endpoint appears in `AuthRateLimitFilter.LIMITED_PATHS`; a 6th request inside 15 minutes
  returns 429.
- Google OAuth login unaffected.
- `tests/auth-security.test.ts` updated and passing.
- `mvn -q verify` on the backend branch.

---

## Suggested order

1. **Item 6** — one file, trivial, proves the toolchain.
2. **Item 3** — self-contained, unlocks correct mobile auth UX.
3. **Item 2** — `SearchScreen` only; touch `CustomerScreens.tsx` before Item 1 does.
4. **Item 1** — largest; same file as Item 2, so sequence them.
5. **Item 4** — frontend-only + a seed tweak; independent of everything above.
6. **Item 5** — last. Blocked on branch + security decisions.

Items 1–4 and 6 are **frontend-only** (Item 4 also touches the backend seed file, not code).
Only Item 5 needs backend Java.

---

## Decisions (locked in — 2026-09-22)

1. **Item 5 branch.** Lands on `feat/auth-module` (where `AuthController` actually lives), not
   `base-shrey-variants`.
   **Verified before starting anything:** nothing is listening on `localhost:8080` right now —
   `Invoke-WebRequest` to both `/actuator/info` and `/actuator/health` timed out (no backend
   process running). Backend repo's checked-out branch is confirmed `base-shrey-variants`
   (`git branch --show-current`). So there is currently no live server to conflict with; whoever
   runs the backend for Item 5 work must explicitly check out `feat/auth-module` first — it will
   not happen automatically.
2. **Item 5 security.** Option B — distinguishable `ACCOUNT_NOT_FOUND` from `otp/verify`,
   activating the dead frontend branches at `AuthForm.tsx:60-67`. Smaller diff, no new public
   enumeration endpoint. `otp/send` stays exactly as neutral as it is today; one OTP is still
   consumed before the user is routed to signup, which is the accepted tradeoff.
3. **Item 1 scope.** Today's filters only — category, labVerified, sort. Price range / in-stock
   (and the rupees↔paise UI conversion they'd require) are explicitly out of scope, separate task.
4. **Item 1 desktop bugs.** Fixed in the same pass — the absolute-link bug (category, labVerified
   wipe other params and navigate away from `/search`/`/category/[slug]`) and the relative-link
   bug (sort wipes the whole query string) are touched anyway while building the serializer.
5. **Item 2 scope.** On-page input + explicit empty state only. Typeahead
   (`getSearchSuggestions`, debounce, dropdown) is a separate feature — do not wire it now.
6. **Item 2 filters.** Do not expand `/search`'s filter set in this pass. Fix the actual bug
   (search echoing the products page); leave `category`/`price`/`tags`/`page` support on `/search`
   for later, since it changes the meaning of existing deep links.
7. **Item 4 seed.** Extend `raw-forest-honey-500g` to ~5 images using `placehold.co` or
   `images.unsplash.com` URLs so `next.config.ts` needs no new allowed host.
8. **Git — one branch per item, stacked by actual dependency, not all off one base:**
   - Item 5 (auth) branches from `feat/auth-module` on the backend (real dependency: needs the
     actual `AuthController`). Its frontend half branches from `feat/google-signin-ui` — same
     base as items 6/3/4, *not* stacked on `feat/mobile-filter-sheet`. There is no real
     dependency between item 5's frontend files (`AuthForm.tsx`, `OTPVerification.tsx`,
     `store/auth.store.ts`, `lib/api/endpoints/auth.ts`, `lib/api/errors.ts`) and anything the
     filter-sheet branch touches; stacking on it would only inherit unrelated commits that later
     need rebasing away.
   - Items 6, 3, 4 have no dependency on each other or on Item 5 — each stacks independently off
     the current frontend tip, `feat/google-signin-ui`.
   - Items 1 and 2 *do* have a real dependency on each other (both touch `CustomerScreens.tsx`),
     so 1 is sequenced on top of 2's branch rather than forked separately.
   - Actual branches created:
     - `fix/checkout-duplicate-address-cta` (item 6) — off `feat/google-signin-ui`
     - `feat/mobile-account-state` (item 3) — off `feat/google-signin-ui`
     - `feat/product-image-lightbox` (item 4, frontend) — off `feat/google-signin-ui`
     - `feat/product-image-lightbox-seed` (item 4, backend seed data) — off `base-shrey-variants`
       (data-only change, no auth dependency)
     - `fix/search-dedicated-ui` (item 2) — off `feat/google-signin-ui`
     - `feat/mobile-filter-sheet` (item 1) — off `fix/search-dedicated-ui` (real dependency)
     - `feat/otp-account-not-found` (item 5, frontend) — off `feat/google-signin-ui`, sibling to
       6/3/4/2, not stacked under 1
     - Item 5's backend half — off `feat/auth-module`, once that branch is checked out
   - **Order to start: 6 → 3 → 4 → (2 and 1, sequenced) → 5.** Items 6, 3, 4 completed with no
     blockers. Item 5 waits until `feat/auth-module` is checked out in the backend repo — as of
     this check, the backend repo is still on `base-shrey-variants`
     (`git branch --show-current`), so item 5's backend half has not started.
