'use client';

import { BarChart3, ClipboardCheck, FileText, Package, ShieldCheck, Truck, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Stepper } from '@/components/ui/Stepper';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DataTable, type Column } from '@/components/dashboard/DataTable';
import { StatCard } from '@/components/dashboard/StatCard';
import { VerificationKanban } from '@/components/dashboard/VerificationKanban';
import {
  adminMetrics,
  labReports,
  orders,
  products,
  vendors,
  verificationSubmissions,
} from '@/lib/data/fixtures';
import { formatCurrency } from '@/lib/utils/money';
import type { Order, Product, Vendor, VerificationSubmission } from '@/types';

const salesData = [
  { month: 'Jan', sales: 3.2 },
  { month: 'Feb', sales: 4.1 },
  { month: 'Mar', sales: 5.8 },
  { month: 'Apr', sales: 6.7 },
  { month: 'May', sales: 8.4 },
];

function ChartPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-80 rounded-lg border border-surface-border bg-surface-base p-5 shadow-xs">
      <h2 className="mb-4 font-heading text-2xl">Revenue trend</h2>
      {mounted ? (
        <ResponsiveContainer height="85%" minHeight={220} width="100%">
          <BarChart data={salesData}>
            <CartesianGrid stroke="#E2DDD7" strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" fill="#3B6B4A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[220px] items-end gap-4">
          {salesData.map((item) => (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
              <span className="w-full rounded-t-md bg-brand-light" style={{ height: `${item.sales * 18}px` }} />
              <span className="text-xs text-text-muted">{item.month}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const productColumns: Column<Product>[] = [
  { header: 'Product', cell: (row) => <span className="font-semibold">{row.name}</span> },
  { header: 'Brand', cell: (row) => row.brand },
  { header: 'Price', cell: (row) => formatCurrency(row.price) },
  {
    header: 'Verification',
    cell: (row) => <Badge variant={row.isLabVerified ? 'success' : 'info'}>{row.verificationStatus}</Badge>,
  },
  { header: 'Stock', cell: (row) => (row.inStock ? row.stockCount : 'Out') },
];

const orderColumns: Column<Order>[] = [
  { header: 'Order', cell: (row) => <span className="font-semibold">{row.id}</span> },
  { header: 'Status', cell: (row) => <Badge variant="info">{row.status}</Badge> },
  { header: 'Items', cell: (row) => row.items.length },
  { header: 'Total', cell: (row) => formatCurrency(row.total) },
  { header: 'Payment', cell: (row) => row.paymentMethod },
];

const vendorColumns: Column<Vendor>[] = [
  { header: 'Vendor', cell: (row) => <span className="font-semibold">{row.name}</span> },
  { header: 'Owner', cell: (row) => row.ownerName },
  { header: 'Status', cell: (row) => <Badge variant={row.status === 'approved' ? 'success' : 'info'}>{row.status}</Badge> },
  { header: 'Products', cell: (row) => row.productCount },
  { header: 'Rating', cell: (row) => row.rating.toFixed(1) },
];

const verificationColumns: Column<VerificationSubmission>[] = [
  { header: 'Product', cell: (row) => <span className="font-semibold">{row.productName}</span> },
  { header: 'Vendor', cell: (row) => row.vendorName },
  { header: 'Lab', cell: (row) => row.labPartner },
  { header: 'Status', cell: (row) => <Badge variant={row.status === 'approved' ? 'success' : 'info'}>{row.status}</Badge> },
  { header: 'Submitted', cell: (row) => new Date(row.submittedAt).toLocaleDateString('en-IN') },
];

export function VendorDashboardScreen() {
  return (
    <DashboardShell role="vendor" title="Vendor Dashboard">
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard delta="+18% this week" icon={Package} label="Active products" value="18" />
        <StatCard delta="4 awaiting lab" icon={ShieldCheck} label="Verification" value="7" />
        <StatCard delta="12 dispatches" icon={Truck} label="Open orders" value="24" />
        <StatCard delta="Next payout Friday" icon={FileText} label="Payout due" value="Rs 1.8L" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <ChartPanel />
        <div className="rounded-lg border border-surface-border bg-surface-base p-5">
          <h2 className="font-heading text-2xl">Verification tracker</h2>
          <div className="mt-4 grid gap-3">
            {verificationSubmissions.slice(0, 4).map((item) => (
              <Link key={item.id} className="rounded-md bg-surface-raised p-3" href="/vendor/verification">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{item.productName}</span>
                  <Badge variant="info">{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{item.labPartner}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export function VendorProductsScreen() {
  return (
    <DashboardShell role="vendor" title="Products">
      <div className="mb-4 flex justify-end">
        <Link className="inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-text-inverse" href="/vendor/products/new">
          Add Product
        </Link>
      </div>
      <DataTable columns={productColumns} rows={products} />
    </DashboardShell>
  );
}

export function VendorProductWizardScreen() {
  return (
    <DashboardShell role="vendor" title="Add Product">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <Stepper active={3} steps={['Basic Info', 'Images', 'Pricing', 'Compliance', 'Submit']} />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <form className="grid gap-4 md:grid-cols-2">
            <Input label="Product name" placeholder="Organic Wildflower Honey" />
            <Input label="Brand" placeholder="Himalayan Labs" />
            <Input label="Category" placeholder="Honey" />
            <Input label="SKU" placeholder="HON-500-TRV" />
            <Input label="MRP" placeholder="699" />
            <Input label="Sale price" placeholder="499" />
            <Input label="Stock quantity" placeholder="24" />
            <Input label="Unit / Weight" placeholder="500g" />
            <Input className="md:col-span-2" label="Compliance certificate" placeholder="Upload PDF (mock)" />
            <Button className="md:col-span-2" size="lg">Submit for Verification</Button>
          </form>
          <aside className="rounded-md bg-brand-light p-5">
            <h2 className="font-heading text-2xl">Lab & compliance</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Products are not purchasable until compliance and lab review are complete.
            </p>
            <Badge className="mt-4" variant="info">Verification Pending</Badge>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}

export function VendorInventoryScreen() {
  return (
    <DashboardShell role="vendor" title="Inventory">
      <DataTable columns={productColumns} rows={products} />
    </DashboardShell>
  );
}

export function VendorOrdersScreen() {
  return (
    <DashboardShell role="vendor" title="Orders">
      <DataTable columns={orderColumns} rows={orders} />
    </DashboardShell>
  );
}

export function VendorPayoutsScreen() {
  return (
    <DashboardShell role="vendor" title="Payouts">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard delta="Clears in 2 days" icon={FileText} label="Next payout" value="Rs 1.8L" />
        <StatCard delta="+12%" icon={BarChart3} label="May sales" value="Rs 8.4L" />
        <StatCard delta="0 disputes" icon={ShieldCheck} label="Held amount" value="Rs 0" />
      </div>
    </DashboardShell>
  );
}

export function VendorAnalyticsScreen() {
  return (
    <DashboardShell role="vendor" title="Analytics">
      <ChartPanel />
    </DashboardShell>
  );
}

export function VendorVerificationScreen() {
  return (
    <DashboardShell role="vendor" title="Verification Tracker">
      <DataTable columns={verificationColumns} rows={verificationSubmissions} />
    </DashboardShell>
  );
}

export function AdminDashboardScreen() {
  return (
    <DashboardShell role="admin" title="Admin Dashboard">
      <div className="grid gap-5 md:grid-cols-4">
        {adminMetrics.map((metric, index) => (
          <StatCard
            key={metric.label}
            delta={metric.delta}
            icon={[BarChart3, ShieldCheck, Users, ClipboardCheck][index]}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <ChartPanel />
        <div className="rounded-lg border border-surface-border bg-surface-base p-5">
          <h2 className="font-heading text-2xl">Action queue</h2>
          <div className="mt-4 grid gap-3">
            {['Approve 3 vendors', 'Review 5 lab reports', 'Publish homepage banner', 'Resolve 2 refunds'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md bg-surface-raised p-3">
                <span className="font-semibold">{item}</span>
                <Button size="sm" variant="outline">Open</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export function AdminVendorsScreen() {
  return (
    <DashboardShell role="admin" title="Vendor Management">
      <DataTable columns={vendorColumns} rows={vendors} />
    </DashboardShell>
  );
}

export function AdminProductsScreen() {
  return (
    <DashboardShell role="admin" title="Product Queue">
      <DataTable columns={productColumns} rows={products} />
    </DashboardShell>
  );
}

export function AdminVerificationScreen() {
  return (
    <DashboardShell role="admin" title="Verification Kanban">
      <VerificationKanban submissions={verificationSubmissions} />
    </DashboardShell>
  );
}

export function AdminOrdersScreen() {
  return (
    <DashboardShell role="admin" title="Orders">
      <DataTable columns={orderColumns} rows={orders} />
    </DashboardShell>
  );
}

export function AdminContentScreen() {
  return (
    <DashboardShell role="admin" title="Content Management">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <h2 className="font-heading text-2xl">Homepage banner</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input label="Headline" placeholder="Scientific Purity. Every batch lab-verified." />
          <Input label="CTA" placeholder="Browse Verified Products" />
          <Input className="md:col-span-2" label="Banner image URL" placeholder="https://..." />
        </div>
        <Button className="mt-5">Save Content</Button>
      </section>
    </DashboardShell>
  );
}

export function AdminConfigScreen() {
  return (
    <DashboardShell role="admin" title="Configurations">
      <section className="grid gap-4 rounded-lg border border-surface-border bg-surface-base p-6 md:grid-cols-2">
        <Input label="Commission rate" placeholder="12%" />
        <Input label="Free shipping threshold" placeholder="499" />
        <Input label="COD surcharge" placeholder="0" />
        <Input label="Service zones" placeholder="Metro + Tier 1" />
        <Button className="md:col-span-2">Save Settings</Button>
      </section>
    </DashboardShell>
  );
}

export function AdminRolesScreen() {
  const rows = [
    { name: 'Ops Manager', email: 'ops@truzov.test', role: 'Order Manager' },
    { name: 'Verification Lead', email: 'verify@truzov.test', role: 'Lab Reviewer' },
    { name: 'Content Editor', email: 'content@truzov.test', role: 'CMS Editor' },
  ];

  return (
    <DashboardShell role="admin" title="Roles & Permissions">
      <DataTable
        columns={[
          { header: 'Name', cell: (row) => row.name },
          { header: 'Email', cell: (row) => row.email },
          { header: 'Role', cell: (row) => <Badge variant="info">{row.role}</Badge> },
        ]}
        rows={rows}
      />
    </DashboardShell>
  );
}

export function LabDashboardScreen() {
  return (
    <DashboardShell role="lab" title="Lab Dashboard">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard delta="6 due today" icon={ClipboardCheck} label="Open requests" value="18" />
        <StatCard delta="2 awaiting admin" icon={FileText} label="Reports uploaded" value="9" />
        <StatCard delta="98.6%" icon={ShieldCheck} label="SLA compliance" value="High" />
      </div>
      <div className="mt-6">
        <DataTable columns={verificationColumns} rows={verificationSubmissions} />
      </div>
    </DashboardShell>
  );
}

export function LabRequestsScreen() {
  return (
    <DashboardShell role="lab" title="Sample Requests">
      <DataTable columns={verificationColumns} rows={verificationSubmissions} />
    </DashboardShell>
  );
}

export function LabUploadScreen() {
  return (
    <DashboardShell role="lab" title="Upload Lab Report">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Product ID" placeholder="prd-001" />
          <Input label="Batch ID" placeholder="TRV-9042" />
          <Input label="Pesticides" placeholder="Not detected" />
          <Input label="Heavy metals" placeholder="Not detected" />
          <Input className="md:col-span-2" label="PDF report" placeholder="Upload report.pdf (mock)" />
        </div>
        <Button className="mt-5">Submit report for admin review</Button>
      </section>
    </DashboardShell>
  );
}

export function LabHistoryScreen() {
  return (
    <DashboardShell role="lab" title="Verification History">
      <div className="grid gap-4">
        {labReports.map((report) => (
          <article key={report.id} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">{report.batchId}</h2>
                <p className="text-sm text-text-secondary">{report.summary}</p>
              </div>
              <Badge variant={report.status === 'pass' ? 'success' : 'info'}>{report.status}</Badge>
            </div>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}

export function DetailShell({ role, title, children }: { role: 'vendor' | 'admin' | 'lab'; title: string; children: React.ReactNode }) {
  return (
    <DashboardShell role={role} title={title}>
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">{children}</section>
    </DashboardShell>
  );
}
