/**
 * Validates whether a redirect path is safe for internal navigation.
 * Prevents open redirect attacks by ensuring the URL is a relative path.
 */
export function isValidRedirect(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('\\');
}
