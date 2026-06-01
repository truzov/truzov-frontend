import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout title="Log In" subtitle="Enter your email to receive an OTP">
      <LoginForm />
    </AuthLayout>
  );
}
