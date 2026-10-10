import type { Metadata } from 'next';
import { TicketScreen } from '@/components/screens/TicketScreen';

export const metadata: Metadata = { title: 'Support & tickets' };

export default function Page() { return <TicketScreen />; }
