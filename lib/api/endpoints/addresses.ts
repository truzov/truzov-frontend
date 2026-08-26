import { apiRequest } from '@/lib/api/client';
import type { AddressDto, CreateAddressRequest } from '@/types/api';

/**
 * Saved delivery addresses for the authenticated user.
 *
 * Note what is absent: there is no PATCH, no DELETE and no set-default endpoint. Only list and
 * create exist (plan §6.1, ticket §T6), which is why the UI offers no edit or remove action — a
 * button that changed local state and then vanished on reload would be worse than no button.
 */

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
