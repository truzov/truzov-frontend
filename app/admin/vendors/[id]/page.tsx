import { DetailShell } from '@/components/screens/WorkspaceScreens';
import { vendors } from '@/lib/data/fixtures';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = vendors.find((item) => item.id === id) ?? vendors[0];

  return (
    <DetailShell role="admin" title="Vendor Detail">
      <h2 className="font-heading text-2xl">{vendor.name}</h2>
      <p className="mt-2 text-text-secondary">{vendor.ownerName} - {vendor.email}</p>
      <div className="mt-5 flex gap-3">
        <button className="rounded-md bg-brand-primary px-4 py-2 font-semibold text-text-inverse">Approve</button>
        <button className="rounded-md border border-text-danger px-4 py-2 font-semibold text-text-danger">Reject</button>
      </div>
    </DetailShell>
  );
}
