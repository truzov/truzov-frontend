import { ProductListingScreen } from '@/components/screens/CustomerScreens';
import { parseFilterRecord } from '@/lib/utils/filters';

export const revalidate = 120;

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const filters = parseFilterRecord(await searchParams);

  return (
    <ProductListingScreen
      filters={{ ...filters, category: slug }}
      title={`${slug.replaceAll('-', ' ')} marketplace`}
    />
  );
}
