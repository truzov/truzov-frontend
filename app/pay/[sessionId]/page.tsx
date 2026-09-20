import { MockPaymentScreen } from '@/components/checkout/MockPaymentScreen';

/**
 * The mock gateway's pay page, addressed by payment session id.
 *
 * Sits at the top level rather than inside the (checkout) route group on purpose: it stands in for
 * a hosted page on the provider's own domain, so it should not wear our checkout progress chrome.
 */
export default function Page() {
  return <MockPaymentScreen />;
}
