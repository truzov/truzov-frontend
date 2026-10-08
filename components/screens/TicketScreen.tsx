'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuthStore } from '@/store/auth.store';
import { getTicket, listTickets, openTicket, replyToTicket, type SupportTicket } from '@/lib/api/endpoints/support';

const fieldClass = 'w-full rounded-lg border border-[#dce6d8] bg-white p-3';
const ticketKeys = ['support-tickets'];

/** ponytail: reuse the existing owner-scoped ticket API for both customers and sellers. */
export function TicketScreen() {
  const { isLoggedIn, isLoading } = useProtectedRoute(false);
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  useEffect(() => { setSelected(null); setPage(1); setError(null); }, [userId]);
  const tickets = useQuery({
    queryKey: [...ticketKeys, userId, page],
    queryFn: ({ signal }) => listTickets(page, signal),
    enabled: isLoggedIn,
  });
  const detail = useQuery({
    queryKey: [...ticketKeys, userId, 'detail', selected],
    queryFn: ({ signal }) => getTicket(selected!, signal),
    enabled: isLoggedIn && Boolean(selected),
  });

  async function submit(event: FormEvent<HTMLFormElement>, reply = false) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const body = String(values.get('body') ?? '').trim();
    const subject = String(values.get('subject') ?? '').trim();
    if (!body || (!reply && !subject)) { setError('Enter a subject and message.'); return; }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const result = reply
        ? await replyToTicket(selected!, body)
        : await openTicket({ type: values.get('type') as SupportTicket['type'], subject, body });
      form.reset();
      setSelected(result.ticket.id);
      setPage(1);
      client.setQueryData([...ticketKeys, userId, 'detail', result.ticket.id], result);
      await client.invalidateQueries({ queryKey: [...ticketKeys, userId] });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not send your message. Please try again.');
    } finally { submitting.current = false; setPending(false); }
  }

  return <section className="mx-auto max-w-6xl px-4 py-10">
    <h1 className="text-3xl">Support & tickets</h1>
    <p className="mb-6 mt-3">Raise a ticket, follow its status, and reply to the truzov support team.</p>
    {isLoading ? <p role="status">Loading your account…</p> : !isLoggedIn ? <p><a className="underline" href="/login?redirect=%2Fsupport%2Ftickets">Sign in</a> to raise a ticket and view your requests.</p> : <>
      {error && <p className="mb-4 text-red-700" role="alert">{error}</p>}
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl">New ticket</h2>
          <form className="grid gap-4 rounded-2xl border border-[#dce6d8] bg-white p-5" onSubmit={submit}>
            <fieldset className="grid gap-4" disabled={pending}>
              <label>Topic<select className={fieldClass} name="type" defaultValue="order"><option value="order">Orders & delivery</option><option value="payment">Payments</option><option value="product">Product & lab reports</option><option value="account">My account</option><option value="other">Something else</option></select></label>
              <Input label="Subject" name="subject" maxLength={200} required />
              <label>Message<textarea className={fieldClass} name="body" rows={5} maxLength={5000} required /></label>
              <Button type="submit">{pending ? 'Sending…' : 'Create ticket'}</Button>
            </fieldset>
          </form>
          <h2 className="mb-3 mt-8 text-xl">Your tickets</h2>
          {tickets.isPending ? <p role="status">Loading tickets…</p> : tickets.isError ? <div role="alert"><p>Could not load your tickets.</p><Button variant="outline" onClick={() => void tickets.refetch()}>Retry</Button></div> : <>
            {tickets.data.items.length === 0 && <p>No tickets yet.</p>}
            <ul className="grid gap-3">{tickets.data.items.map((ticket) => <li key={ticket.id}><button className={fieldClass + ' text-left'} aria-pressed={selected === ticket.id} onClick={() => setSelected(ticket.id)}><span className="block break-words">{ticket.subject}</span><span className="text-sm">{ticket.ticketNumber} · {ticket.status}</span></button></li>)}</ul>
            <div className="mt-3 flex items-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={page * 20 >= tickets.data.total} onClick={() => setPage(page + 1)}>Next</Button></div>
          </>}
        </div>
        <div aria-live="polite">
          {selected && (detail.isPending ? <p>Loading conversation…</p> : detail.isError ? <div role="alert"><p>Could not load this ticket.</p><Button variant="outline" onClick={() => void detail.refetch()}>Retry</Button></div> : detail.data && <>
            <h2 className="break-words text-xl">{detail.data.ticket.subject}</h2>
            <p className="my-3">{detail.data.ticket.ticketNumber} · Status: {detail.data.ticket.status}</p>
            <ol className="grid gap-4">{detail.data.messages.map((message) => <li className="rounded-xl border border-[#dce6d8] bg-white p-4" key={message.id}><p className="text-sm">{message.fromAdmin ? 'truzov support' : message.senderName} · {new Date(message.createdAt).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap break-words">{message.body}</p></li>)}</ol>
            <form className="mt-5 grid gap-3" onSubmit={(event) => void submit(event, true)}><fieldset disabled={pending} className="grid gap-3"><label>Reply<textarea className={fieldClass} name="body" maxLength={5000} rows={4} required /></label><Button type="submit">{pending ? 'Sending…' : 'Send reply'}</Button></fieldset></form>
          </>)}
        </div>
      </div>
    </>}
  </section>;
}
