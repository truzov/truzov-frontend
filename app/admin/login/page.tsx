import { redirect } from 'next/navigation';

/**
 * There is one sign-in endpoint for everyone (`POST /auth/login`), and the user's role comes back
 * in the token response — the client does not choose it. So a separate "admin login" screen has
 * nothing different to do, and the previous one was actively unsafe: it called `loginAs('admin')`
 * and granted an admin-flavoured session without checking a single credential.
 */
export default function Page() {
  redirect('/login?redirect=%2Fadmin');
}
