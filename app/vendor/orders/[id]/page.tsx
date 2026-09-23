import { DetailShell, NotAvailableYet } from '@/components/screens/WorkspaceScreens';

/**
 * Gated. `GET /orders/{orderId}` returns only the caller's own orders, so a vendor cannot read an
 * order placed with them. The dispatch and fulfilment actions this screen implied were never wired
 * to anything.
 */
export default function Page() {
  return (
    <DetailShell role="vendor" title="Order Detail">
      <NotAvailableYet
        backHref="/vendor/orders"
        backLabel="Back to orders"
        needs="A vendor-readable order endpoint plus fulfilment actions. Order reads are scoped to the authenticated user."
        ticket="§6.2 / §T2"
        title="Order detail"
      />
    </DetailShell>
  );
}
