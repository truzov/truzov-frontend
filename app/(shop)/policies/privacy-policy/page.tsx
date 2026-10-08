import { PrivacyPolicyScreen } from '@/components/screens/PolicyScreens';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | truzov Verification Health',
  description: 'truzov privacy policy, personal data collection, usage, third-party sharing, cookies, and data rights.',
};

export default function Page() {
  return <PrivacyPolicyScreen />;
}
