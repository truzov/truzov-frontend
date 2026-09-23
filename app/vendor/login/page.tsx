import { redirect } from 'next/navigation';

/** One real login endpoint for every role; the role arrives in the token response. See /login. */
export default function Page() {
  redirect('/login?redirect=%2Fvendor');
}
