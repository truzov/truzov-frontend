import { DetailShell, NotAvailableYet } from '@/components/screens/WorkspaceScreens';

/**
 * Gated. The product itself is readable via `GET /products/{slugOrId}`, but this screen exists to
 * APPROVE or REJECT it against its lab data, and there are no moderation endpoints. Rendering a
 * read-only copy of the public product page under an "approve" heading would imply an action that
 * cannot be taken.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <DetailShell role="admin" title="Product Review">
      <NotAvailableYet
        backHref={`/products/${id}`}
        backLabel="View the public product page"
        needs="Product moderation endpoints (approve / reject against lab data). The product is readable publicly, but no approval action exists."
        ticket="§6.3 / §T2"
        title="Product review"
      />
    </DetailShell>
  );
}
