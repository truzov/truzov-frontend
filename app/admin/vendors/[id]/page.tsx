import { DetailShell, NotAvailableYet } from '@/components/screens/WorkspaceScreens';

/**
 * Gated. There is no vendor resource in the API — no list, no detail, no approve/reject.
 *
 * The Approve and Reject buttons that used to be here were not wired to anything at all, and the
 * vendor shown was a fixture that fell back to `vendors[0]` for any unknown id. The closest real
 * capability is promoting a user to the vendor role via `PUT /admin/users/{id}/role`, which lives
 * on the Roles screen.
 */
export default function Page() {
  return (
    <DetailShell role="admin" title="Vendor Detail">
      <NotAvailableYet
        backHref="/admin/roles"
        backLabel="Change a user's role instead"
        needs="A vendor resource (detail, documents, approve/reject). Promoting a user to the vendor role is possible today via PUT /admin/users/{id}/role."
        ticket="§6.3 / §T2"
        title="Vendor detail"
      />
    </DetailShell>
  );
}
