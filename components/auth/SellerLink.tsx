'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { sellerDestination } from '@/lib/config/seller';
import { useAuthStore } from '@/store/auth.store';

export function SellerLink(props: Omit<ComponentProps<typeof Link>, 'href'>) {
  const role = useAuthStore((state) => state.user?.role);
  return <Link {...props} href={sellerDestination(role)} />;
}
