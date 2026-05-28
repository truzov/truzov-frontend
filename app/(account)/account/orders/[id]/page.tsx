import { OrderDetailScreen } from '@/components/screens/CustomerScreens';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailScreen id={id} />;
}
