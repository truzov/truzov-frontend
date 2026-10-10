/**
 * Wire types for the Truzov backend, mirroring TRUZOV_API_REFERENCE.md.
 *
 * RULES FOR THIS FILE — please keep them:
 *
 * 1. Field names and optionality match the reference exactly. No renaming, no convenience
 *    reshaping. When a backend field changes, the diff should land here and nowhere else,
 *    so a future reader can trace any UI field back to a documented DTO.
 * 2. Adaptation to what a component wants (e.g. `categorySlug` -> a display name, or the
 *    cart's `line1` -> a formatted address) happens at the component boundary, not here.
 * 3. A field is marked optional (`?`) when the backend may omit it. That is broader than it
 *    looks: the backend runs `spring.jackson.default-property-inclusion: non_null`, so every
 *    null field is *absent from the JSON entirely* rather than present as `null`. Optional is
 *    therefore the correct model for "nullable" here, and every read needs a presence check.
 * 4. Where the reference does not enumerate a shape, it is marked
 *    `VERIFY:` with what we assumed and why. Those are the only places a wrong guess can
 *    hide, so they are called out rather than silently invented.
 */

/* ------------------------------------------------------------------ envelopes */

/** Successful responses: `{ "data": {}, "message": "optional human-readable message" }`. */
export interface ApiEnvelope<T> {
  data: T;
  /** Omitted when the backend does not supply one. */
  message?: string;
}

/** Paginated payloads always sit inside `data`. */
export interface PagedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** One entry of an error's `details` array, e.g. `{ field: "page", issue: "must be >= 1" }`. */
export interface ApiErrorDetail {
  field: string;
  issue: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  /** Per-field validation failures. Omitted for errors that are not field-specific. */
  details?: ApiErrorDetail[];
  /** Correlates with the backend log line. Omitted in some responses. */
  traceId?: string;
  timestamp?: string;
  status?: number;
  path?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

/* ----------------------------------------------------------------------- auth */

export type UserRole = 'customer' | 'vendor' | 'lab' | 'admin';

export interface UserProfileDto {
  id: string;
  name: string;
  /** Optional: signup accepts an account with a phone and no email. */
  email?: string;
  role: UserRole;
  phone?: string;
  /** Documented as nullable, so absent when unset. */
  avatarUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export type OtpChannel = 'phone' | 'email';

export interface TokenResponse {
  accessToken: string;
  /** Opaque, not a JWT. Rotated (and the old one invalidated) on every refresh. */
  refreshToken: string;
  tokenType: string;
  /** Access-token lifetime in seconds. The backend caps this at 900. */
  expiresIn: number;
  user: UserProfileDto;
}

export interface SignupRequest {
  fullName: string;
  /** Optional overall, but required when `otpChannel` is 'email'. */
  email?: string;
  phone: string;
  password: string;
  /** Defaults to 'phone' server-side; sent explicitly so the client's intent is unambiguous. */
  otpChannel?: OtpChannel;
}

export interface SignupResponse {
  userId: string;
  /** Null when a carried-forward verified session skipped the signup OTP. */
  otpSessionId: string | null;
  otpRequired: boolean;
  otpChannel: OtpChannel;
  expiresInSeconds: number;
}

export type OtpPurpose = 'login' | 'verify' | 'phone_change';

export interface OtpSendRequest {
  identifier: string;
  purpose?: OtpPurpose;
}

export interface OtpSendResponse {
  otpSessionId: string;
  channel: OtpChannel;
  expiresInSeconds: number;
}

export interface OtpVerifyRequest {
  otpSessionId: string;
  /** Numeric string, 4-10 digits. Kept as a string so a leading zero survives. */
  code: string;
}

export interface LoginRequest {
  /** Phone or email. The backend also accepts `email`/`phone` aliases; we only send this. */
  identifier: string;
  password: string;
}

/**
 * Body for `POST /auth/oauth/google`.
 *
 * There is no `redirectUri` field by design: the backend uses its own configured value when
 * redeeming the code, so a caller cannot aim the exchange at an unregistered URI. Ours must
 * match it exactly or Google rejects the exchange.
 */
export interface OAuthLoginRequest {
  /** Single-use authorization code from Google's redirect. */
  code: string;
  /** PKCE verifier for the challenge that started the flow. 43-128 characters. */
  codeVerifier: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
  /** true revokes every refresh token for the user, not just this session. */
  allSessions?: boolean;
}

/* ----------------------------------------------------------- public storefront */

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  image?: string;
  parentId?: string;
  sortOrder?: number;
  isActive: boolean;
}

export interface BannerDto {
  id: string;
  /**
   * Free-form placement key, e.g. 'hero'. Deliberately NOT a union: the reference documents
   * `?placement=hero` as an example rather than an enum, and the seed data uses 'hero'.
   * Narrowing it here would break the moment marketing adds a new placement.
   */
  placement: string;
  headline: string;
  subtext?: string;
  ctaLabel?: string;
  href?: string;
  imageUrl?: string;
  active: boolean;
  saleEndsAt?: string;
  sortOrder?: number;
}

/**
 * CONFIRMED against the running backend (2026-08-22): `images` is an array of objects shaped
 * `{ id, url, alt, sortOrder }`. `alt` was populated for every seeded image, but it stays
 * optional here and consumers fall back to the product name — alt text is an accessibility
 * requirement and must not depend on a field the contract does not guarantee.
 */
export interface ProductImageDto {
  id?: string;
  url: string;
  alt?: string;
  sortOrder?: number;
}

/**
 * CONFIRMED against the running backend (2026-08-22): `{ id, label, value, priceModifier,
 * inStock, stockCount }`. `stockCount` remains optional for compatibility with older
 * deployments; new responses expose the actual variant ceiling for quantity selection.
 *
 * `priceModifier` is a signed delta in rupees (seed values: -200, 0, +700).
 */
export interface ProductVariantDto {
  id: string;
  label: string;
  value: string;
  priceModifier?: number;
  stockCount?: number;
  inStock?: boolean;
}

export type LabMetricStatus = 'pass' | 'warning' | 'fail';

export interface LabMetricDto {
  label: string;
  value: string;
  status: LabMetricStatus;
}

/**
 * VERIFY: the reference names `verificationStatus` without listing its values. The seed data
 * uses 'approved' and 'pending'. The trailing `(string & {})` keeps the known values as
 * autocomplete hints without rejecting a status the backend adds later — a hard union here
 * would turn a new backend status into a type error on data that is perfectly valid.
 */
export type VerificationStatus =
  | 'pending'
  | 'submitted'
  | 'samples_collected'
  | 'in_lab'
  | 'report_uploaded'
  | 'approved'
  | 'rejected'
  | (string & {});

/**
 * Prices are integer RUPEES on every product DTO.
 *
 * The one exception in the whole API is the `minPrice`/`maxPrice` query parameters on
 * /products, which are PAISE. That conversion lives in exactly one place — see
 * lib/api/endpoints/catalog.ts — so it cannot drift.
 */
export interface ProductSummaryDto {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  price: number;
  mrp: number;
  /** Percentage off, computed server-side. Do not recompute from price/mrp. */
  discount: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  isLabVerified: boolean;
  isBestseller: boolean;
  isOrganic: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  tags: string[];
  images: ProductImageDto[];
  /**
   * Optional and additive: today's backend does NOT send variants on listing responses
   * (product list, search, home blocks). Card-level variant selection is therefore
   * opt-in on the data — a card renders a variant selector only when this collection
   * arrives with 2 or more entries, and degrades to a simple-product card otherwise.
   * `ProductDetailDto` re-declares it as required, which stays type-compatible.
   */
  variants?: ProductVariantDto[];
}

/**
 * Note what is NOT here, because several components used to rely on it: there is no
 * `batchId`, `vendorId`, `sellerName`, `labReportId`, or `reportAvailable` on any product
 * DTO. See FRONTEND_API_MIGRATION_PLAN.md §6.1 — those UI affordances were removed rather
 * than back-filled with invented values.
 */
export interface ProductDetailDto extends ProductSummaryDto {
  weight?: string;
  description?: string;
  stockCount: number;
  verificationStatus: VerificationStatus;
  benefits: string[];
  ingredients: string[];
  certifications: string[];
  variants: ProductVariantDto[];
  labMetrics: LabMetricDto[];
}

export interface ReviewDto {
  id: string;
  /**
   * Display name only. CONFIRMED (2026-08-22): the response carries no reviewer user id, so the
   * old local `Review.userId` had no source and was removed rather than faked.
   */
  userName: string;
  rating: number;
  title?: string;
  body?: string;
  /** Verified purchase. */
  verified: boolean;
  createdAt: string;
}

export interface ProductBatchRequest {
  /** Max 100 ids per call, enforced server-side. */
  ids: string[];
}

export interface SearchSuggestionsDto {
  products: Array<{ id: string; slug: string; name: string; imageUrl?: string }>;
  categories: Array<{ slug: string; name: string }>;
  brands: string[];
}

export type LabReportStatus = 'pass' | 'fail' | 'pending' | (string & {});

export interface LabReportDto {
  id: string;
  productId: string;
  batchId: string;
  labName: string;
  status: LabReportStatus;
  summary?: string;
  metrics: LabMetricDto[];
  pdfUrl?: string;
  uploadedAt?: string;
}

/** `GET /home` aggregate — one call for the whole homepage. */
export interface HomeDto {
  banners: BannerDto[];
  categories: CategoryDto[];
  bestSellers: ProductSummaryDto[];
  newArrivals: ProductSummaryDto[];
  featured: ProductSummaryDto[];
}

/* ------------------------------------------------------- account and commerce */

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Field names differ from the old local model on purpose: the API uses `line1`/`line2`,
 * not `addressLine1`/`addressLine2`. Sending the old names would be rejected outright,
 * because the backend sets `fail-on-unknown-properties: true`.
 */
export interface AddressDto {
  id: string;
  /** e.g. 'Home'. The UI previously hardcoded a "Home" pill; it now renders this. */
  label?: string;
  fullName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  isDefault: boolean;
}

/** Only `line1` is required server-side; the client asks for more for delivery quality. */
export interface CreateAddressRequest {
  label?: string;
  fullName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  /** Six digits when supplied. */
  pincode?: string;
  landmark?: string;
  isDefault?: boolean;
}

/**
 * A cart line as the server sees it.
 *
 * Two things matter for callers: mutations are keyed by `id` (the LINE id), not `productId`
 * — a product can appear on more than one line via variants — and `lineTotal` is the
 * server's arithmetic, so it is what gets displayed. `availableStock` is what the "N left"
 * hint reads; the client does not clamp quantity itself.
 */
export interface CartItemDto {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  inStock: boolean;
  availableStock: number;
}

/**
 * `subtotal` is the ONLY money value the cart endpoint returns. There is no discount, fee,
 * or total here — those exist only on an order, after checkout. Do not synthesise them.
 */
export interface CartDto {
  items: CartItemDto[];
  itemCount: number;
  subtotal: number;
}

export interface AddCartItemRequest {
  productId: string;
  /** Explicit null is not sent; omitted when the product has no variant selection. */
  variantId?: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  /** Replaces the line quantity outright; it is not a delta. */
  quantity: number;
}

/**
 * VERIFY: the reference names `WishlistItemDto[]` without listing fields. `id` and
 * `productId` are certain from usage — `DELETE /wishlist/items/{itemId}` and
 * `POST /wishlist/items/{itemId}/move-to-cart` need the item id, while the UI only ever
 * knows a product id, so the mapping between them is what makes the heart toggle work.
 * The product display fields are optimistically typed as optional so a thinner-than-expected
 * response degrades to "no preview" instead of throwing.
 */
export interface WishlistItemDto {
  id: string;
  productId: string;
  name?: string;
  slug?: string;
  imageUrl?: string;
  price?: number;
  mrp?: number;
  inStock?: boolean;
}

export interface AddWishlistItemRequest {
  productId: string;
}

/** The documented order state machine. `processing` and `refunded` do not exist. */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

/**
 * Confirmed against the live API and enforced by the database: `orders.payment_status` carries
 * `CHECK (payment_status IN ('unpaid','paid','refunded'))`, so these three are the only values
 * that can ever be stored. Closed rather than open on purpose — an exhaustive union is what makes
 * a mistaken comparison a compile error instead of a badge that never lights up.
 *
 * Note `captured` and `failed` belong to the GATEWAY's vocabulary, recorded on `payments.status`.
 * They are not order payment statuses and never appear here. A failed payment deliberately leaves
 * the order `unpaid`.
 */
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

/**
 * Mirrors the API exactly. The field names differ from the cart line and that is not an
 * oversight: the order line reports `productName` and `totalPrice` where the cart reports
 * `name` and `lineTotal`.
 *
 * `slug` and `imageUrl` are optional because the API does not return them yet — `order_items`
 * stores neither. Consumers must handle their absence rather than assume a link or a thumbnail.
 */
export interface OrderItemDto {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  slug?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderSummaryDto {
  id: string;
  /** Human-facing reference. Use `id` for links, `orderNumber` for display. */
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

/**
 * Note there is no `address` here. Order detail and confirmation cannot show a shipping
 * address from the order itself — see plan §T5 for the backend ticket, and D9 for how the
 * confirmation screen works around it in the meantime.
 *
 * `deliveryFee` is legitimately 0 on local config (`truzov.commerce.delivery-fee: 0`).
 * Zero is a real value, not "missing" — render it rather than hiding the line.
 */
export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  couponCode?: string;
  totalAmount: number;
  items: OrderItemDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface CheckoutRequest {
  addressId: string;
  cartItemIds?: string[];
  couponCode?: string;
}

export interface CouponQuote {
  code: string;
  discountAmount: number;
  subtotal: number;
  /** Server-confirmed total, including delivery. */
  total: number;
}

/** Outcome of a payment attempt. Distinct from `PaymentStatus`, which describes the ORDER. */
export type PaymentSessionStatus = 'created' | 'completed' | 'failed';

/**
 * A payment attempt the customer can act on.
 *
 * Two handoff styles are represented so this code needs no knowledge of which gateway is
 * configured: follow `payUrl` when present, otherwise hand `providerParams` to the provider's
 * widget. The mock uses `payUrl`; an embedded provider such as Razorpay would use the params.
 */
export interface PaymentSessionDto {
  sessionId: string;
  orderId: string;
  /** Lower-case provider id, e.g. `mock`. Useful in support and unambiguous in logs. */
  provider: string;
  status: PaymentSessionStatus;
  /** Rupees, taken from the order total on the server. Never proposed by this client. */
  amount: number;
  payUrl: string | null;
  providerParams: Record<string, string>;
}

export interface CreatePaymentSessionRequest {
  orderId: string;
}

/** Which way to send a simulated payment. Development only. */
export interface MockPaymentCompletionRequest {
  outcome: 'success' | 'failure';
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  reason?: string;
}

/* ------------------------------------------------------------- vendor / admin */

/**
 * No `vendorId` field exists, deliberately: the server derives ownership from the access
 * token. Adding one would not be ignored — `fail-on-unknown-properties: true` makes an
 * undocumented field a 400.
 */
export interface VendorProductRequest {
  name: string;
  slug?: string;
  categorySlug: string;
  brand: string;
  /** Rupees, >= 0, and `mrp` must be >= `price`. */
  price?: number;
  mrp?: number;
  stockCount?: number;
  weight?: string;
  description?: string;
  tags?: string[];
  benefits?: string[];
  ingredients?: string[];
  certifications?: string[];
  isPublished?: boolean;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
  reason?: string;
}
