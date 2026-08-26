import { DetailShell, NotAvailableYet } from '@/components/screens/WorkspaceScreens';

/**
 * Gated for now.
 *
 * `PUT /vendor/products/{productId}` and `DELETE` both exist, so editing IS possible — but a full
 * replace needs every current field pre-filled, and there is no vendor-scoped read to load them
 * from. `GET /products/{id}` would work only for a PUBLISHED product, and products are created
 * unpublished, so an edit form built on it would silently fail for exactly the drafts a vendor most
 * needs to edit.
 *
 * This becomes an edit form as soon as there is a vendor-scoped product read (plan §T2).
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <DetailShell role="vendor" title="Product Detail">
      <NotAvailableYet
        backHref="/vendor/products/new"
        backLabel="Create a new product"
        needs={`A vendor-scoped read for product ${id}. PUT replaces every field, so an edit form needs the current values, and unpublished drafts are not readable from the public catalogue.`}
        ticket="§6.2 / §T2"
        title="Edit product"
      />
    </DetailShell>
  );
}
