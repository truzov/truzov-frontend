'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { listOffers } from '@/lib/api/endpoints/coupons';
import { formatCurrency } from '@/lib/utils/money';

export function OffersScreen() {
  const offers = useQuery({ queryKey: ['offers'], queryFn: ({ signal }) => listOffers(signal) });
  return <section className="mx-auto max-w-6xl px-4 py-10">
    <h1 className="text-3xl">Offers & coupons</h1>
    <p className="mb-6 mt-3">Use a current code in your bag. Eligibility and savings are checked against your selected products at checkout.</p>
    {offers.isPending ? <p role="status">Loading offers…</p> : offers.isError ? <div role="alert"><p>Could not load offers.</p><Button variant="outline" onClick={() => void offers.refetch()}>Retry</Button></div> : offers.data.length === 0 ? <p>There are no active coupons right now.</p> : <ul className="grid gap-5 sm:grid-cols-2">
      {offers.data.map((offer) => <li className="rounded-2xl border border-[#dce6d8] bg-white p-6" key={offer.code}>
        <h2 className="break-words text-xl">{offer.title}</h2>
        <p className="my-3">Save up to {formatCurrency(offer.couponAmount)} · Minimum bag {formatCurrency(offer.minAmount)}</p>
        {offer.shortDescription && <p className="mb-3 whitespace-pre-wrap break-words">{offer.shortDescription}</p>}
        <p>Code: <code className="select-all font-semibold">{offer.code}</code></p>
        <p className="mt-2 text-sm">Ends {new Date(offer.endDate).toLocaleString()}</p>
      </li>)}
    </ul>}
    <Link className="mt-8 inline-block underline" href="/products">Browse products</Link>
  </section>;
}
