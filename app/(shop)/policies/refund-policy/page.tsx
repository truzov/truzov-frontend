import { RefundPolicyScreen } from '@/components/screens/PolicyScreens';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | truzov Verification Health',
  description: 'truzov refund policy, return window, refund processing, and batch verification guarantees.',
};

export default function Page() {
  return <RefundPolicyScreen />;
}
