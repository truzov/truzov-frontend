/** Older profiles may still arrive with the migration sentinel until the API is upgraded. */
export function accountPhone(phone?: string | null): string | undefined {
  return phone && !phone.startsWith('__mig_') ? phone : undefined;
}
