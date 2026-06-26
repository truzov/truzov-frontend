import { RefundPolicyScreen } from '@/components/screens/PolicyScreens';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | Truzov Verification Health',
  description: 'Truzov refund policy, return window, refund processing, and batch verification guarantees.',
};

export default function Page() {
  return <RefundPolicyScreen />;
}
