import { SearchScreen } from '@/components/screens/CustomerScreens';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <SearchScreen query={typeof params.q === 'string' ? params.q : undefined} />;
}
