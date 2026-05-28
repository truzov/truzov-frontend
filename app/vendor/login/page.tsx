import { AuthScreen } from '@/components/screens/AuthScreens';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AuthScreen mode="login" role="vendor" />;
}
