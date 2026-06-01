import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link className="inline-flex items-center" href="/">
      <Image src="/truzov-logo.png" alt="truzov" width={160} height={40} className="h-8 w-auto" />
    </Link>
  );
}
