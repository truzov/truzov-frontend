import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <AuthLayout title="Log In" subtitle="Enter your email or phone number to receive an OTP">
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
