import { apiRequest } from '@/lib/api/client';
import type { ProductDetailDto, VendorProductRequest } from '@/types/api';

/**
 * Vendor product management. VENDOR role required; the server derives ownership from the token.
 *
 * This is the ENTIRE vendor surface the API exposes. There is no vendor-scoped product list, no
 * vendor order list, no payouts and no analytics endpoint — see plan §6.2. Those screens are
 * gated rather than fed fixture data.
 */

/** Returns 201 with the created product. */
export function createVendorProduct(body: VendorProductRequest): Promise<ProductDetailDto> {
  return apiRequest<ProductDetailDto>('/vendor/products', {
    method: 'POST',
    auth: true,
    body,
  });
}

/**
 * Full REPLACE, not a patch — every field the product should keep must be present in the body,
 * because omitted fields are not preserved.
 */
export function replaceVendorProduct(
  productId: string,
  body: VendorProductRequest
): Promise<ProductDetailDto> {
  return apiRequest<ProductDetailDto>(`/vendor/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    auth: true,
    body,
  });
}

/** Deactivates rather than hard-deletes. Returns 204. */
export function deleteVendorProduct(productId: string): Promise<void> {
  return apiRequest<void>(`/vendor/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    auth: true,
  });
}
