/**
 * Validates whether a redirect path is safe for internal navigation.
 * Prevents open redirect attacks by ensuring the URL is a relative path.
 */
export function isValidRedirect(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/') && !url.startsWith('//') && !/[\\\u0000-\u001f\u007f]/.test(url);
}
