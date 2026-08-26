import type { Metadata } from 'next';
import { ProductListingScreen } from '@/components/screens/CustomerScreens';
import { parseFilters } from '@/lib/utils/filters';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'All Products',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <ProductListingScreen
      // Parsed by the shared adapter rather than hand-mapped here, so the URL contract lives in
      // one place. The previous inline version also had a subtle bug: `inStock: params.inStock
      // === 'true'` produced `false` when the parameter was absent, and an explicit
      // `inStock=false` asks the server for out-of-stock items only.
      filters={parseFilters(toSearchParams(params))}
      title="Verified Marketplace"
    />
  );
}

/** Next gives searchParams as an object; parseFilters works on URLSearchParams. */
function toSearchParams(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      search.set(key, value);
    } else if (Array.isArray(value)) {
      // A repeated parameter (?tags=a&tags=b) arrives as an array; parseFilters reads `tags` as
      // a comma-separated list, so join rather than dropping the extra values.
      search.set(key, value.join(','));
    }
  }

  return search;
}
