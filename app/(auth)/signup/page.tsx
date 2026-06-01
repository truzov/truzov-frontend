// Redirect signup to register for backward compatibility
import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect('/auth/register');
}
