import { TermsOfServiceScreen } from '@/components/screens/PolicyScreens';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Truzov Verification Health',
  description: 'Truzov terms of service, platform acceptance, marketplace role, accuracy of lab reports, and liability disclaimer.',
};

export default function Page() {
  return <TermsOfServiceScreen />;
}
