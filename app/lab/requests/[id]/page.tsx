import { DetailShell, NotAvailableYet } from '@/components/screens/WorkspaceScreens';

/**
 * Gated. There is no verification-submission resource in the API. `verificationStatus` is a
 * read-only string on a product, so a "sample request" has no entity behind it and no way to be
 * fetched, assigned or transitioned.
 */
export default function Page() {
  return (
    <DetailShell role="lab" title="Sample Request">
      <NotAvailableYet
        backHref="/lab/requests"
        backLabel="Back to requests"
        needs="A verification submission resource. Only a product's read-only verificationStatus exists today."
        ticket="§6.4 / §T2"
        title="Sample request"
      />
    </DetailShell>
  );
}
