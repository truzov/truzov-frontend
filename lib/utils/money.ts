/**
 * Money formatting.
 *
 * `calculateCartTotals`, `FREE_SHIPPING_THRESHOLD` and `STANDARD_SHIPPING` used to live here and are
 * gone deliberately. They computed a subtotal, a coupon discount, a shipping fee and a total in the
 * browser from hardcoded policy (10% capped at Rs 150; free over Rs 499, otherwise Rs 49) — none of
 * which is the server's pricing. The API reference is explicit that checkout totals must not be
 * calculated client-side, and the delivery fee is backend configuration
 * (`truzov.commerce.delivery-fee`) surfaced on the order.
 *
 * Displayed money now comes from `CartDto.subtotal`, `CartItemDto.lineTotal`, and
 * `OrderDto.subtotal` / `deliveryFee` / `totalAmount`.
 */

/** All product and order amounts from this API are integer RUPEES, so no minor-unit division. */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Percentage off, for the rare place that needs it locally.
 *
 * Prefer `ProductSummaryDto.discount`, which the server computes — a product card must show the
 * server's number so it cannot disagree with the price the server charges. This helper exists for
 * display of arbitrary price pairs, not to second-guess the API.
 */
export function calculateDiscount(price: number, mrp: number) {
  if (mrp <= 0 || price >= mrp) {
    return 0;
  }

  return Math.round((1 - price / mrp) * 100);
}
