import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OffersScreen } from '@/components/screens/OffersScreen';
import { apiRequest } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function mount() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><OffersScreen /></QueryClientProvider>); }

describe('offers page', () => {
  it('shows only backend offers with a public read and no checkout mutation', async () => {
    vi.mocked(apiRequest).mockResolvedValue([{ code: 'FOREST10', title: 'Forest offer', couponAmount: 10, minAmount: 100, endDate: '2099-10-08T00:00:00Z' }]);
    mount();
    expect(await screen.findByText('FOREST10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Forest offer' })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/offers', { signal: expect.any(AbortSignal) });
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('shows an honest empty state rather than invented coupons', async () => {
    vi.mocked(apiRequest).mockResolvedValue([]);
    mount();
    expect(await screen.findByText('There are no active coupons right now.')).toBeInTheDocument();
  });
});
