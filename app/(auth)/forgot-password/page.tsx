import type { Metadata } from 'next';
import { ResetPasswordScreen } from '@/components/screens/ResetPasswordScreen';

export const metadata: Metadata = { title: 'Reset password | truzov' };
export default function Page() { return <ResetPasswordScreen />; }
