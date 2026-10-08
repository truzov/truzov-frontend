import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketScreen } from '@/components/screens/TicketScreen';
import { apiRequest } from '@/lib/api/client';

const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock('@/hooks/useProtectedRoute', () => ({ useProtectedRoute: () => ({ isLoggedIn: session.signedIn, isLoading: false }) }));
vi.mock('@/store/auth.store', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 'customer-1' } }) }));
vi.mock('@/lib/api/client', () => ({ apiRequest: vi.fn() }));

const ticket = { id: 'ticket-1', ticketNumber: 'TKT-1', subject: 'Delivery question', status: 'open', type: 'order', messageCount: 1 };
const result = { ticket, messages: [{ id: 'message-1', senderName: 'Customer', fromAdmin: false, body: 'Where is my order?', createdAt: '2026-10-08T00:00:00Z' }] };

function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TicketScreen /></QueryClientProvider>);
}

describe('owner-scoped support tickets', () => {
  beforeEach(() => { vi.clearAllMocks(); session.signedIn = true; });
  afterEach(cleanup);

  it('requires a session and sends no ticket requests for a guest', () => {
    session.signedIn = false;
    mount();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?redirect=%2Fsupport%2Ftickets');
    expect(apiRequest).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Create ticket' })).not.toBeInTheDocument();
  });

  it('waits for persistence, prevents repeated submit, then shows ticket status and thread', async () => {
    let resolve!: (value: typeof result) => void;
    vi.mocked(apiRequest).mockImplementation((path, options) => {
      if (options?.method === 'POST') return new Promise((done) => { resolve = done; });
      if (path === '/support/tickets/ticket-1') return Promise.resolve(result);
      return Promise.resolve({ items: [], total: 0, page: 1, limit: 20 });
    });
    mount();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Delivery question' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Where is my order?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }));
    expect(screen.queryByText(/Status: open/)).not.toBeInTheDocument();
    fireEvent.submit(screen.getByLabelText('Subject').closest('form')!);
    expect(vi.mocked(apiRequest).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    expect(apiRequest).toHaveBeenCalledWith('/support/tickets', { method: 'POST', auth: true, body: { type: 'order', subject: 'Delivery question', body: 'Where is my order?' } });
    await act(async () => resolve(result));
    expect(await screen.findByText('TKT-1 · Status: open')).toBeInTheDocument();
    expect(screen.getByText('Where is my order?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'An update please.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(apiRequest).toHaveBeenCalledWith('/support/tickets/ticket-1/messages', { method: 'POST', auth: true, body: { body: 'An update please.' } });
    await act(async () => resolve(result));
  });

  it('preserves drafts and never claims receipt on a failed submission', async () => {
    vi.mocked(apiRequest).mockImplementation((_, options) => options?.method === 'POST'
      ? Promise.reject(new Error('Try again later.'))
      : Promise.resolve({ items: [], total: 0, page: 1, limit: 20 }));
    mount();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Delivery question' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Where is my order?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again later.');
    expect(screen.getByLabelText('Message')).toHaveValue('Where is my order?');
    expect(screen.queryByText(/Status: open/)).not.toBeInTheDocument();
  });
});
