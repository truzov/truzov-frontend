import { redirect } from 'next/navigation';
import { sellerDestination } from '@/lib/config/seller';

/** Legacy registration links open the public seller application, never a privileged signup. */
export default function Page() {
  redirect(sellerDestination());
}
