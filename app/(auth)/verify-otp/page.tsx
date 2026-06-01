import { AuthLayout } from '@/components/auth/AuthLayout';
import { OTPVerification } from '@/components/auth/OTPVerification';

export default function VerifyOTPPage() {
  return (
    <AuthLayout title="Verify Your Email" subtitle="Enter the verification code sent to your email address.">
      <OTPVerification />
    </AuthLayout>
  );
}
