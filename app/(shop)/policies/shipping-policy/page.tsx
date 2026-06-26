import { ShippingPolicyScreen } from '@/components/screens/PolicyScreens';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy | Truzov Verification Health',
  description: 'Truzov shipping rates, delivery timelines, cold-chain logistics, and package security details.',
};

export default function Page() {
  return <ShippingPolicyScreen />;
}
