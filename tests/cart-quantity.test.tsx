import React from 'react';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { renderWithRedux as render, reduxWrapper } from './redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '@/store/redux';
import { CartQuantityControl } from '@/components/product/CartQuantityControl';
import { useRemoveCartItem } from '@/hooks/api/useCart';
import { queryKeys } from '@/lib/api/queries';
import { authChanged } from '@/store/auth.store';
import { updateCartItem, removeCartItem } from '@/lib/api/endpoints/cart';
import type { CartDto, UserProfileDto } from '@/types/api';

let store: ReturnType<typeof makeStore>;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api/endpoints/cart', () => ({ getCart: vi.fn(), addCartItem: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn() }));

const product = { productId: 'product', productName: 'Fixture honey', slug: 'fixture-honey', unitPrice: 100, variantId: 'small' };
const initial: CartDto = { items: [{ ...product, id: 'line', name: product.productName, quantity: 1, lineTotal: 100, inStock: true, availableStock: 3 }], itemCount: 1, subtotal: 100 };
const clients: QueryClient[] = [];
function renderControls() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  client.setQueryData(queryKeys.cart(), initial);
  render(<QueryClientProvider client={client}><CartQuantityControl max={3} product={product} /><CartQuantityControl max={3} product={product} /></QueryClientProvider>, { store });
  return client;
}

beforeEach(() => {
  store = makeStore();
  vi.clearAllMocks();

  store.dispatch(authChanged({ user: null, isLoggedIn: false, status: 'anonymous' }));
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
    expect(store.getState().guestCart.items).toEqual([]);
  });

  it('optimistically updates all views, blocks duplicate saves and rolls back a failed server write', async () => {
    store.dispatch(authChanged({ isLoggedIn: true, status: 'authenticated', user: { id: 'fixture-user' } as UserProfileDto }));
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
    expect(store.getState().ui.toasts.at(-1)?.type).toBe('error');
  });

  it('uses the owner-scoped server line id for decrement-to-zero', async () => {
    store.dispatch(authChanged({ isLoggedIn: true, status: 'authenticated', user: { id: 'fixture-user' } as UserProfileDto }));
    vi.mocked(removeCartItem).mockResolvedValue({ items: [], itemCount: 0, subtotal: 0 });
    renderControls();
    fireEvent.click(screen.getAllByRole('button', { name: 'Decrease quantity of Fixture honey' })[0]);
    await waitFor(() => expect(removeCartItem).toHaveBeenCalledWith('line'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Add Fixture honey' })).toHaveLength(2));
  });
});

it('keeps completed bag removals when a later selected line fails', async () => {
  store.dispatch(authChanged({ isLoggedIn: true, status: 'authenticated', user: { id: 'fixture-user' } as UserProfileDto }));
  const [first] = initial.items;
  const second = { ...first, id: 'line-2', variantId: 'large' };
  const third = { ...first, id: 'line-3', variantId: 'medium' };
  const remaining = { items: [second, third], itemCount: 2, subtotal: 200 };
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  clients.push(client);
  client.setQueryData(queryKeys.cart(), { items: [first, second, third], itemCount: 3, subtotal: 300 });
  vi.mocked(removeCartItem)
    .mockResolvedValueOnce(remaining)
    .mockRejectedValueOnce(new Error('Connection lost'));
  const { result } = renderHook(useRemoveCartItem, {
    wrapper: reduxWrapper(store, ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>),
  });

  act(() => result.current.mutate([first.id, second.id, third.id]));

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(vi.mocked(removeCartItem).mock.calls).toEqual([[first.id], [second.id]]);
  expect(client.getQueryData(queryKeys.cart())).toEqual(remaining);
  expect(client.getQueryState(queryKeys.cart())?.isInvalidated).toBe(true);
  expect(store.getState().ui.toasts.at(-1)).toMatchObject({
    type: 'error',
    title: 'Could not remove every selected item',
  });
});
