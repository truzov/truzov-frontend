import { DetailShell, NotAvailableYet } from '@/components/screens/WorkspaceScreens';

/**
 * Gated. `GET /orders/{orderId}` is scoped to the AUTHENTICATED USER, so an administrator cannot
 * read someone else's order through it. `PATCH /orders/{orderId}/status` does accept admin
 * transitions, so the actions are possible once there is an admin-readable order — the missing
 * piece is the read, not the write.
 *
 * Previously rendered `findOrder(id)` from fixtures, which fell back to `orders[0]` for ANY id and
 * therefore showed a real-looking order and total for an order that did not exist.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <DetailShell role="admin" title="Order Management">
      <NotAvailableYet
        backHref="/admin/orders"
        backLabel="Back to orders"
        needs={`An admin-readable order endpoint. GET /orders and GET /orders/{id} return only the caller's own orders, so order ${id} cannot be loaded here.`}
        ticket="§6.3 / §T2"
        title="Order management"
      />
    </DetailShell>
  );
}
