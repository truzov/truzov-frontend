import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartQuantityControl } from '@/components/product/CartQuantityControl';
import { queryKeys } from '@/lib/api/queries';
import { useGuestCartStore } from '@/lib/cart/guest-cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { updateCartItem, removeCartItem } from '@/lib/api/endpoints/cart';
import type { CartDto, UserProfileDto } from '@/types/api';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api/endpoints/cart', () => ({ getCart: vi.fn(), addCartItem: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn() }));

const product = { productId: 'product', productName: 'Fixture honey', slug: 'fixture-honey', unitPrice: 100, variantId: 'small' };
const initial: CartDto = { items: [{ ...product, id: 'line', name: product.productName, quantity: 1, lineTotal: 100, inStock: true, availableStock: 3 }], itemCount: 1, subtotal: 100 };
const clients: QueryClient[] = [];
function renderControls() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  client.setQueryData(queryKeys.cart(), initial);
  render(<QueryClientProvider client={client}><CartQuantityControl max={3} product={product} /><CartQuantityControl max={3} product={product} /></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  useGuestCartStore.setState({ items: [], hydrated: true });
  useAuthStore.setState({ user: null, isLoggedIn: false, status: 'anonymous' });
  useUiStore.setState({ toasts: [] });
});
afterEach(() => clients.splice(0).forEach((client) => client.clear()));

describe('shared ADD quantity control', () => {
  it('synchronizes guest cards, caps stock and removes the line at zero', () => {
    renderControls();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Fixture honey' })[0]);
    expect(screen.getAllByText('1')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Increase quantity of Fixture honey' })[1]);
    expect(screen.getAllByText('2')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Increase quantity of Fixture honey' })[0]);
    expect(screen.getAllByRole('button', { name: 'Increase quantity of Fixture honey' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Decrease quantity of Fixture honey' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Decrease quantity of Fixture honey' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Decrease quantity of Fixture honey' })[0]);
    expect(screen.getAllByRole('button', { name: 'Add Fixture honey' })).toHaveLength(2);
    expect(useGuestCartStore.getState().items).toEqual([]);
  });

  it('optimistically updates all views, blocks duplicate saves and rolls back a failed server write', async () => {
    useAuthStore.setState({ isLoggedIn: true, status: 'authenticated', user: { id: 'fixture-user' } as UserProfileDto });
    let fail!: (reason: Error) => void;
    vi.mocked(updateCartItem).mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    const client = renderControls();
    fireEvent.click(screen.getAllByRole('button', { name: 'Increase quantity of Fixture honey' })[0]);
    await waitFor(() => expect(screen.getAllByText('2')).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: 'Increase quantity of Fixture honey' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(updateCartItem).toHaveBeenCalledTimes(1);
    await act(async () => { fail(new Error('Fixture stock change')); });
    await waitFor(() => expect(screen.getAllByText('1')).toHaveLength(2));
    expect(client.getQueryData(queryKeys.cart())).toEqual(initial);
    expect(useUiStore.getState().toasts.at(-1)?.type).toBe('error');
  });

  it('uses the owner-scoped server line id for decrement-to-zero', async () => {
    useAuthStore.setState({ isLoggedIn: true, status: 'authenticated', user: { id: 'fixture-user' } as UserProfileDto });
    vi.mocked(removeCartItem).mockResolvedValue({ items: [], itemCount: 0, subtotal: 0 });
    renderControls();
    fireEvent.click(screen.getAllByRole('button', { name: 'Decrease quantity of Fixture honey' })[0]);
    await waitFor(() => expect(removeCartItem).toHaveBeenCalledWith('line'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Add Fixture honey' })).toHaveLength(2));
  });
});
