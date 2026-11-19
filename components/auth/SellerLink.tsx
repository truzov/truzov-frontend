'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { sellerDestination } from '@/lib/config/seller';
import { useAppSelector } from '@/store/redux';

export function SellerLink(props: Omit<ComponentProps<typeof Link>, 'href'>) {
  const role = useAppSelector((state) => state.auth.user?.role);
  return <Link {...props} href={sellerDestination(role)} />;
}
