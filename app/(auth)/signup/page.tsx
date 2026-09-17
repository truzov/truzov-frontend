import { AuthModalRedirect } from '@/components/auth/AuthModalRedirect';

/**
 * Signup is a popup, not a page. This route only opens the modal (and carries any `?redirect=`)
 * so old links and `/register` (which redirects here) keep working.
 */
export default function SignupPage() {
  return <AuthModalRedirect mode="signup" />;
}
