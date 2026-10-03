'use client';

import { Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';

export function QuantitySelector({ value, max, disabled, onChange }: {
  value: number; max: number; disabled?: boolean; onChange: (quantity: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const number = Number(draft ?? value);
    onChange(Number.isFinite(number) ? Math.min(max, Math.max(1, Math.trunc(number))) : value);
    setDraft(null);
  };
  return <div>
    <label className="text-sm font-medium text-on-surface-variant" htmlFor={id}>Quantity</label>
    <div className="mt-2 flex w-fit overflow-hidden rounded-xl border border-outline-variant bg-white">
      <button aria-label="Decrease quantity" className="grid h-11 w-11 place-items-center hover:bg-surface-container disabled:opacity-40" disabled={disabled || value <= 1} onClick={() => { setDraft(null); onChange(Math.max(1, value - 1)); }} type="button"><Minus aria-hidden="true" size={18} /></button>
      <input className="h-11 w-16 border-0 bg-white text-center font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" id={id} type="number" inputMode="numeric" min={1} max={max} step={1} disabled={disabled} value={draft ?? value} onBlur={commit} onChange={(event) => { const raw = event.target.value; setDraft(raw); const next = Number(raw); if (raw && Number.isInteger(next) && next >= 1 && next <= max) onChange(next); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />
      <button aria-label="Increase quantity" className="grid h-11 w-11 place-items-center hover:bg-surface-container disabled:opacity-40" disabled={disabled || value >= max} onClick={() => { setDraft(null); onChange(Math.min(max, value + 1)); }} type="button"><Plus aria-hidden="true" size={18} /></button>
    </div>
  </div>;
}
