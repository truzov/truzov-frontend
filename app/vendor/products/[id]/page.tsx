import { DetailShell } from '@/components/screens/WorkspaceScreens';
import { findProduct } from '@/lib/data/fixtures';
import { formatCurrency } from '@/lib/utils/money';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = findProduct(id) ?? findProduct('pure-wildflower-honey-500g');

  return (
    <DetailShell role="vendor" title="Product Detail">
      <h2 className="font-heading text-2xl">{product?.name}</h2>
      <p className="mt-2 text-text-secondary">{product?.description}</p>
      <p className="mt-4 font-semibold">{product ? formatCurrency(product.price) : ''}</p>
    </DetailShell>
  );
}
