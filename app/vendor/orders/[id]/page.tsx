import { DetailShell } from '@/components/screens/WorkspaceScreens';
import { findOrder } from '@/lib/data/fixtures';
import { formatCurrency } from '@/lib/utils/money';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = findOrder(id);

  return (
    <DetailShell role="vendor" title="Order Detail">
      <h2 className="font-heading text-2xl">{order.id}</h2>
      <p className="mt-2 text-text-secondary">Dispatch label and fulfillment actions for this order.</p>
      <p className="mt-4 font-semibold">{formatCurrency(order.total)}</p>
    </DetailShell>
  );
}
