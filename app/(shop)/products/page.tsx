import type { Metadata } from 'next';
import { ProductListingScreen } from '@/components/screens/CustomerScreens';

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
      filters={{
        category: typeof params.category === 'string' ? params.category : undefined,
        brand: typeof params.brand === 'string' ? params.brand : undefined,
        sort: typeof params.sort === 'string' ? params.sort : 'relevance',
        minPrice: typeof params.minPrice === 'string' ? Number(params.minPrice) : undefined,
        maxPrice: typeof params.maxPrice === 'string' ? Number(params.maxPrice) : undefined,
        inStock: params.inStock === 'true',
        labVerified: params.labVerified === 'true',
      }}
      title="Verified Marketplace"
    />
  );
}
