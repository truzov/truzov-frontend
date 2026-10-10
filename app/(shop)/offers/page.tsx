import type { Metadata } from 'next';
import { OffersScreen } from '@/components/screens/OffersScreen';

export const metadata: Metadata = { title: 'Offers & coupons' };
export default function Page() { return <OffersScreen />; }
