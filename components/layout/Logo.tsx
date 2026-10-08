import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

export function Logo({ className, onClick, light = false }: { className?: string; onClick?: () => void; light?: boolean }) {
  return (
    <Link aria-label="truzov home" className={cn('inline-flex min-h-11 w-[112px] shrink-0 items-center', className)} href="/" onClick={onClick}>
      <Image alt="truzov" className={cn('h-auto w-full', light && 'brightness-0 invert')} src="/truzov-logo-final.png" width={2137} height={736} unoptimized priority />
    </Link>
  );
}
