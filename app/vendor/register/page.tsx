import { redirect } from 'next/navigation';

/**
 * `POST /auth/signup` only creates CUSTOMER accounts — role is assigned afterwards by an
 * administrator via `PUT /admin/users/{id}/role`. There is no vendor self-registration endpoint
 * (plan §6.2), so this points at normal signup rather than implying a vendor application flow
 * that the backend cannot complete.
 */
export default function Page() {
  redirect('/signup');
}
