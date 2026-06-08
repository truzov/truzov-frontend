import { AuthForm } from '@/components/auth/AuthForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function SignupPage() {
  return (
    <AuthLayout title="Create Account" subtitle="Start your journey with verified health solutions.">
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
