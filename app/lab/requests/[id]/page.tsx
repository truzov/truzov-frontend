import { DetailShell } from '@/components/screens/WorkspaceScreens';
import { verificationSubmissions } from '@/lib/data/fixtures';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = verificationSubmissions.find((item) => item.id === id) ?? verificationSubmissions[0];

  return (
    <DetailShell role="lab" title="Sample Request">
      <h2 className="font-heading text-2xl">{request.productName}</h2>
      <p className="mt-2 text-text-secondary">{request.vendorName} - {request.labPartner}</p>
    </DetailShell>
  );
}
