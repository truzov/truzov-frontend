import { AuthModalRedirect } from '@/components/auth/AuthModalRedirect';

/**
 * Login is a popup, not a page. This route only opens the modal (and carries any `?redirect=`)
 * so old links and the guard/session-expiry redirects that still target `/login` keep working.
 */
export default function LoginPage() {
  return <AuthModalRedirect mode="login" />;
}
