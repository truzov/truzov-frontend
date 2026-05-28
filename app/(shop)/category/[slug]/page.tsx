import { ProductListingScreen } from '@/components/screens/CustomerScreens';

export const revalidate = 120;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <ProductListingScreen
      filters={{ category: slug, sort: 'relevance' }}
      title={`${slug.replaceAll('-', ' ')} marketplace`}
    />
  );
}
