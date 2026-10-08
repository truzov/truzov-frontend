'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/ErrorState';
import { NotAvailableYet } from '@/components/ui/NotAvailableYet';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useCategories } from '@/hooks/api/useCatalog';
import { updateUserRole } from '@/lib/api/endpoints/admin';
import { createVendorProduct } from '@/lib/api/endpoints/vendor';
import { errorMessage, fieldError } from '@/lib/api/errors';
import { useUiStore } from '@/store/ui.store';
import type { UserRole, VendorProductRequest } from '@/types/api';

/**
 * Vendor, admin and lab workspaces.
 *
 * Almost everything here is gated rather than implemented, and that is the correct outcome rather
 * than unfinished work. The API exposes exactly two endpoints for these roles:
 *
 *   POST/PUT/DELETE /vendor/products     -> VendorProductWizardScreen
 *   PUT /admin/users/{id}/role           -> AdminRolesScreen
 *
 * Everything else previously rendered `lib/data/fixtures.ts`: invented GMV figures, a hardcoded
 * Jan-May revenue chart, five fake vendors, fake payout totals, a fake verification queue. Per the
 * agreed approach (plan §8.4), fixture data must never be live on a screen a real user can reach —
 * someone eventually acts on an invented number. Each gated screen names the endpoint it is
 * waiting for so the reader knows what would bring it back.
 */

/* ------------------------------------------------------------------- vendor */

export function VendorDashboardScreen() {
  return (
    <DashboardShell role="vendor" title="Vendor Dashboard">
      <NotAvailableYet
        needs="A vendor-scoped metrics endpoint (active products, verification queue, open orders, payout due). The previous tiles were hardcoded literals."
        ticket="§6.2 / §T2"
        title="Vendor dashboard"
      />
    </DashboardShell>
  );
}

export function VendorProductsScreen() {
  return (
    <DashboardShell role="vendor" title="Products">
      <NotAvailableYet
        backHref="/vendor/products/new"
        backLabel="Add a product"
        needs="A vendor-scoped GET /vendor/products. Only create, replace and delete exist, so there is no way to list the products this vendor owns. GET /products is the public catalogue and is not filtered by owner."
        ticket="§6.2 / §T2"
        title="Your products"
      />
    </DashboardShell>
  );
}

export function VendorInventoryScreen() {
  return (
    <DashboardShell role="vendor" title="Inventory">
      <NotAvailableYet
        needs="A vendor-scoped product list with stock levels (see Products). Stock is writable via PUT /vendor/products/{id} but cannot be listed."
        ticket="§6.2 / §T2"
        title="Inventory"
      />
    </DashboardShell>
  );
}

export function VendorOrdersScreen() {
  return (
    <DashboardShell role="vendor" title="Orders">
      <NotAvailableYet
        needs="A vendor-scoped order list. GET /orders returns only the AUTHENTICATED USER's own orders, so it cannot show orders placed with this vendor."
        ticket="§6.2 / §T2"
        title="Orders"
      />
    </DashboardShell>
  );
}

export function VendorPayoutsScreen() {
  return (
    <DashboardShell role="vendor" title="Payouts">
      <NotAvailableYet
        needs="A payouts endpoint. There is no payout, settlement or ledger resource in the API at all."
        ticket="§6.2 / §T2"
        title="Payouts"
      />
    </DashboardShell>
  );
}

export function VendorAnalyticsScreen() {
  return (
    <DashboardShell role="vendor" title="Analytics">
      <NotAvailableYet
        needs="A sales analytics endpoint. The revenue chart here was five hardcoded months (Jan-May), not data."
        ticket="§6.2 / §T2"
        title="Analytics"
      />
    </DashboardShell>
  );
}

export function VendorVerificationScreen() {
  return (
    <DashboardShell role="vendor" title="Verification Tracker">
      <NotAvailableYet
        needs="A verification submission resource. `verificationStatus` is a read-only string on a product; there is no submission entity, queue or transition endpoint."
        ticket="§6.2 / §T2"
        title="Verification tracker"
      />
    </DashboardShell>
  );
}

/** Blank form state. Kept separate so a successful submit can reset cleanly. */
const EMPTY_PRODUCT_FORM = {
  name: '',
  slug: '',
  categorySlug: '',
  brand: '',
  price: '',
  mrp: '',
  stockCount: '',
  weight: '',
  description: '',
};

/**
 * The one real vendor screen: `POST /vendor/products`.
 *
 * Previously a static form — placeholder attributes only, no state, no submit handler, and a
 * "Submit for Verification" button wired to nothing.
 */
export function VendorProductWizardScreen() {
  const addToast = useUiStore((state) => state.addToast);
  const { data: categories } = useCategories();
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: VendorProductRequest) => createVendorProduct(body),
    onSuccess: (product) => {
      addToast({
        type: 'success',
        title: 'Product created',
        message: `${product.name} was created as a draft.`,
      });
      setForm(EMPTY_PRODUCT_FORM);
    },
  });

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const price = form.price === '' ? undefined : Number(form.price);
    const mrp = form.mrp === '' ? undefined : Number(form.mrp);

    // Checked client-side because it is the constraint a vendor trips most often, and a rejected
    // submit loses less time than a round trip. The server enforces it regardless.
    if (price !== undefined && mrp !== undefined && mrp < price) {
      setLocalError('MRP must be greater than or equal to the sale price.');
      return;
    }

    mutation.mutate({
      name: form.name.trim(),
      // Optional fields are omitted rather than sent empty: the backend runs
      // `fail-on-unknown-properties` and validates what it receives, so '' is a validation error
      // on a field that could simply have been left out.
      slug: form.slug.trim() || undefined,
      categorySlug: form.categorySlug,
      brand: form.brand.trim(),
      price,
      mrp,
      stockCount: form.stockCount === '' ? undefined : Number(form.stockCount),
      weight: form.weight.trim() || undefined,
      description: form.description.trim() || undefined,
      // Created as a draft on purpose: a vendor should review a product before it is publicly
      // purchasable, and nothing here collects images yet.
      isPublished: false,
    });
  };

  return (
    <DashboardShell role="vendor" title="Add Product">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input
            error={fieldError(mutation.error, 'name')}
            label="Product name"
            onChange={set('name')}
            placeholder="Raw Forest Honey 500g"
            required
            value={form.name}
          />
          <Input
            error={fieldError(mutation.error, 'brand')}
            label="Brand"
            onChange={set('brand')}
            placeholder="truzov"
            required
            value={form.brand}
          />

          {/* A select, not free text: `categorySlug` must match an existing category or the
              request is rejected, and the old placeholder ("Honey") was not even a valid slug. */}
          <label className="grid gap-1.5 text-sm font-medium text-text-secondary">
            Category
            <select
              className="h-11 rounded-sm border border-surface-border bg-surface-base px-3 text-base text-text-primary shadow-xs outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-light"
              onChange={(event) =>
                setForm((current) => ({ ...current, categorySlug: event.target.value }))
              }
              required
              value={form.categorySlug}
            >
              <option value="">Select a category</option>
              {categories?.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Slug (optional)"
            onChange={set('slug')}
            placeholder="raw-forest-honey-500g"
            value={form.slug}
          />
          <Input
            error={fieldError(mutation.error, 'mrp')}
            inputMode="numeric"
            label="MRP (rupees)"
            onChange={set('mrp')}
            placeholder="599"
            value={form.mrp}
          />
          <Input
            error={fieldError(mutation.error, 'price')}
            inputMode="numeric"
            label="Sale price (rupees)"
            onChange={set('price')}
            placeholder="449"
            value={form.price}
          />
          <Input
            inputMode="numeric"
            label="Stock quantity"
            onChange={set('stockCount')}
            placeholder="120"
            value={form.stockCount}
          />
          <Input
            label="Unit / Weight"
            onChange={set('weight')}
            placeholder="500g"
            value={form.weight}
          />
          <Input
            className="md:col-span-2"
            label="Description"
            onChange={set('description')}
            placeholder="Unprocessed, unheated raw honey sourced from wild forest beehives."
            value={form.description}
          />

          {/*
            The SKU and "Compliance certificate" fields are gone: VendorProductRequest has no field
            for either, and there is no upload endpoint, so they could only have discarded input
            (plan §6.2).
          */}

          {localError ? (
            <p className="md:col-span-2 rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger">
              {localError}
            </p>
          ) : null}
          {mutation.isError ? (
            <div className="md:col-span-2">
              <InlineError error={mutation.error} />
            </div>
          ) : null}

          <Button
            className="md:col-span-2"
            disabled={mutation.isPending}
            loading={mutation.isPending}
            size="lg"
            type="submit"
          >
            Create product
          </Button>
          <p className="md:col-span-2 text-xs text-text-secondary">
            Created unpublished. Images are not supported by this endpoint yet, so add them before
            publishing.
          </p>
        </form>
      </section>
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------- admin */

export function AdminDashboardScreen() {
  return (
    <DashboardShell role="admin" title="Admin Dashboard">
      <NotAvailableYet
        needs="An admin metrics endpoint. The four tiles here were literals (GMV Rs 18.4L, 23 pending, 11 vendor apps, 5 refunds) and the action queue was a hardcoded string array."
        ticket="§6.3 / §T2"
        title="Admin dashboard"
      />
    </DashboardShell>
  );
}

export function AdminVendorsScreen() {
  return (
    <DashboardShell role="admin" title="Vendor Management">
      <NotAvailableYet
        needs="A vendor resource. There is no vendor entity in the API at all - no list, no detail, no approve/reject. The five vendors shown here were fixtures."
        ticket="§6.3 / §T2"
        title="Vendor management"
      />
    </DashboardShell>
  );
}

export function AdminProductsScreen() {
  return (
    <DashboardShell role="admin" title="Product Queue">
      <NotAvailableYet
        needs="An admin product queue with approve/reject. GET /products is the public catalogue and exposes no moderation actions."
        ticket="§6.3 / §T2"
        title="Product queue"
      />
    </DashboardShell>
  );
}

export function AdminVerificationScreen() {
  return (
    <DashboardShell role="admin" title="Verification Kanban">
      <NotAvailableYet
        needs="A verification submission resource with status transitions. The kanban moved fixture cards between columns and persisted nothing."
        ticket="§6.3 / §T2"
        title="Verification queue"
      />
    </DashboardShell>
  );
}

export function AdminOrdersScreen() {
  return (
    <DashboardShell role="admin" title="Orders">
      <NotAvailableYet
        needs="An admin order list. GET /orders is scoped to the authenticated user. Note PATCH /orders/{id}/status DOES accept admin transitions, so an admin can act on a known order id - there is just no way to enumerate orders."
        ticket="§6.3 / §T2"
        title="Orders"
      />
    </DashboardShell>
  );
}

export function AdminContentScreen() {
  return (
    <DashboardShell role="admin" title="Content Management">
      <NotAvailableYet
        needs="Banner write endpoints. GET /banners is read-only, so this form could never have saved anything."
        ticket="§6.3 / §T2"
        title="Content management"
      />
    </DashboardShell>
  );
}

export function AdminConfigScreen() {
  return (
    <DashboardShell role="admin" title="Configurations">
      <NotAvailableYet
        needs="A settings endpoint. Commission rate, free-shipping threshold and COD surcharge are backend configuration (truzov.commerce.*) and are not writable over the API."
        ticket="§6.3 / §T2"
        title="Configuration"
      />
    </DashboardShell>
  );
}

const ROLES: UserRole[] = ['customer', 'vendor', 'lab', 'admin'];

/**
 * The one real admin screen: `PUT /admin/users/{id}/role`.
 *
 * It asks for a user id instead of rendering a table because there is no user-list endpoint — the
 * three rows previously shown here (Ops Manager, Verification Lead, Content Editor) were invented.
 * A form that does something real beats a table that shows something false.
 */
export function AdminRolesScreen() {
  const addToast = useUiStore((state) => state.addToast);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<UserRole>('vendor');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      updateUserRole(userId.trim(), { role, reason: reason.trim() || undefined }),
    onSuccess: (user) => {
      addToast({
        type: 'success',
        title: 'Role updated',
        message: `${user.name} is now ${user.role}.`,
      });
      setUserId('');
      setReason('');
    },
    onError: (error) => {
      // The backend refuses to demote the last active administrator. Surfacing the server's
      // message matters here — it is the one failure an admin is most likely to hit and least
      // likely to anticipate.
      addToast({ type: 'error', title: 'Could not update role', message: errorMessage(error) });
    },
  });

  return (
    <DashboardShell role="admin" title="Roles & Permissions">
      <div className="grid gap-6">
        <section className="rounded-lg border border-surface-border bg-surface-base p-6">
          <h2 className="font-heading text-2xl">Change a user&apos;s role</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Enter the user id. Roles are assigned here because signup only ever creates customer
            accounts.
          </p>

          <form
            className="mt-5 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <Input
              error={fieldError(mutation.error, 'id')}
              label="User ID"
              onChange={(event) => setUserId(event.target.value)}
              placeholder="usr_owner"
              required
              value={userId}
            />
            <label className="grid gap-1.5 text-sm font-medium text-text-secondary">
              Role
              <select
                className="h-11 rounded-sm border border-surface-border bg-surface-base px-3 text-base text-text-primary shadow-xs outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-light"
                onChange={(event) => setRole(event.target.value as UserRole)}
                value={role}
              >
                {ROLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <Input
              className="md:col-span-2"
              label="Reason (optional)"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Approved seller"
              value={reason}
            />
            <Button
              className="md:col-span-2"
              disabled={mutation.isPending || userId.trim().length === 0}
              loading={mutation.isPending}
              type="submit"
            >
              Update role
            </Button>
          </form>
        </section>

        <NotAvailableYet
          needs="A user list endpoint, so administrators can find users instead of needing to know an id up front."
          ticket="§6.3 / §T2"
          title="User directory"
        />
      </div>
    </DashboardShell>
  );
}

/* ---------------------------------------------------------------------- lab */

export function LabDashboardScreen() {
  return (
    <DashboardShell role="lab" title="Lab Dashboard">
      <NotAvailableYet
        needs="A lab workspace API. GET /lab-reports is public, read-only and returns only PASSED reports for live products, so it cannot drive a lab's own queue."
        ticket="§6.4 / §T2"
        title="Lab dashboard"
      />
    </DashboardShell>
  );
}

export function LabRequestsScreen() {
  return (
    <DashboardShell role="lab" title="Sample Requests">
      <NotAvailableYet
        needs="A sample request resource. There is no endpoint for requests assigned to a lab."
        ticket="§6.4 / §T2"
        title="Sample requests"
      />
    </DashboardShell>
  );
}

export function LabUploadScreen() {
  return (
    <DashboardShell role="lab" title="Upload Lab Report">
      <NotAvailableYet
        needs="A report upload endpoint. Lab reports are readable but cannot be created or amended over the API, so this form had nowhere to post."
        ticket="§6.4 / §T2"
        title="Upload lab report"
      />
    </DashboardShell>
  );
}

export function LabHistoryScreen() {
  return (
    <DashboardShell role="lab" title="Verification History">
      <NotAvailableYet
        backHref="/trust/lab-reports"
        backLabel="View published reports"
        needs="A lab-scoped report history. The public reports index shows PASSED reports for live products only, which is not the same set a lab needs to see."
        ticket="§6.4 / §T2"
        title="Verification history"
      />
    </DashboardShell>
  );
}

export function DetailShell({
  role,
  title,
  children,
}: {
  role: 'vendor' | 'admin' | 'lab';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell role={role} title={title}>
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        {children}
      </section>
    </DashboardShell>
  );
}

/** Re-exported so gated detail routes can use the same panel without importing two modules. */
export { NotAvailableYet };
