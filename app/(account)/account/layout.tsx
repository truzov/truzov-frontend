import { AccountShell } from '@/components/account/AccountShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
