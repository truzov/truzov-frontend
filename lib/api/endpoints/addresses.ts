import { apiRequest } from '@/lib/api/client';
import type { AddressDto, CreateAddressRequest } from '@/types/api';

export function getAddresses(signal?: AbortSignal): Promise<AddressDto[]> {
  return apiRequest<AddressDto[]>('/users/me/addresses', { auth: true, signal });
}

/**
 * Creates an address. Returns 201 with the created record.
 *
 * Field names are the API's: `line1` / `line2`, not `addressLine1` / `addressLine2`. Sending the
 * old names is a hard 400 rather than a silent ignore, because the backend runs
 * `fail-on-unknown-properties: true`.
 */
export function createAddress(body: CreateAddressRequest): Promise<AddressDto> {
  return apiRequest<AddressDto>('/users/me/addresses', {
    method: 'POST',
    auth: true,
    body,
  });
}

/**
 * Updates one of the caller's own addresses (full replace; same shape as create).
 *
 * A foreign or unknown address id answers 403 identically, so this cannot be used to probe
 * which address ids exist. Returns the updated record so callers can refresh state without a
 * follow-up GET.
 */
export function updateAddress(
  addressId: string,
  body: CreateAddressRequest
): Promise<AddressDto> {
  return apiRequest<AddressDto>(`/users/me/addresses/${encodeURIComponent(addressId)}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteAddress(addressId: string): Promise<void> {
  return apiRequest<void>(`/users/me/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    auth: true,
  });
}
