/** Only a configured HTTP(S) origin can receive seller links; never forward auth tokens. */
export function sellerDestination(role?: string, configured = process.env.NEXT_PUBLIC_SELLER_PLATFORM_URL ?? 'https://truzov-admin.vercel.app'): string {
  if (!configured?.trim()) return role === 'vendor' ? '/vendor' : '/support/seller';
  try {
    const url = new URL(configured.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return role === 'vendor' ? '/vendor' : '/support/seller';
    return `${url.origin}${role === 'vendor' ? '/' : '/apply'}`;
  } catch {
    return role === 'vendor' ? '/vendor' : '/support/seller';
  }
}
