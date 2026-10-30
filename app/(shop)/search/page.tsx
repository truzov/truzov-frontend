import { SearchScreen } from '@/components/screens/CustomerScreens';
import { parseFilterRecord } from '@/lib/utils/filters';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <SearchScreen query={typeof params.q === 'string' ? params.q : undefined} filters={parseFilterRecord(params)} />;
}
