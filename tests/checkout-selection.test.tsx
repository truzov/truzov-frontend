import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuantitySelector } from '@/components/product/QuantitySelector';
import { cartLineKey, selectedCart } from '@/lib/cart/selection';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAuthStore } from '@/store/auth.store';
import type { CartDto } from '@/types/api';

const mocks = vi.hoisted(() => ({ placeOrder: vi.fn(), validate: vi.fn(), push: vi.fn(), logout: vi.fn() }));
const cart: CartDto = { items: [
  { id: 'line-a', productId: 'a', name: 'Honey', slug: 'honey', unitPrice: 100, quantity: 2, lineTotal: 200, inStock: true, availableStock: 10 },
  { id: 'line-b', productId: 'b', name: 'Tea', slug: 'tea', unitPrice: 50, quantity: 1, lineTotal: 50, inStock: false, availableStock: 0 },
], subtotal: 250, itemCount: 3 };

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/cart', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/api/useCart', () => ({
  useCart: () => ({ cart, isLoading: false, isError: false }), useCartItemCount: () => 3,
  useUpdateCartItem: () => ({ mutate: vi.fn(), isPending: false }), useRemoveCartItem: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/api/useCommerce', () => ({
  useAddresses: () => ({ addresses: [{ id: 'addr', fullName: 'Buyer', line1: 'Street', city: 'Delhi', postalCode: '110001', country: 'IN' }], isLoading: false }),
  useCheckout: () => ({ mutate: mocks.placeOrder, isPending: false }),
  useCreatePaymentSession: () => ({ mutate: vi.fn() }), useOrder: () => ({}),
}));
vi.mock('@/hooks/api/useWishlist', () => ({ useToggleWishlist: () => ({ toggle: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/api/useCatalog', () => ({ useCategories: () => ({ data: [] }) }));
vi.mock('@/components/checkout/AddressFormModal', () => ({ AddressFormModal: () => null }));
vi.mock('@/lib/api/endpoints/coupons', () => ({ getCheckoutQuote: mocks.validate }));

import { BagScreen, PaymentScreen } from '@/components/checkout/CheckoutScreens';
import { Header } from '@/components/layout/Header';
import { AccountMenu } from '@/components/auth/AccountMenu';

function mount(component: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  useCheckoutStore.getState().resetCheckout();
  useAuthStore.setState({ isLoggedIn: true, status: 'authenticated', user: { id: 'buyer', name: 'Buyer', phoneVerified: true } as never, logout: mocks.logout });
  mocks.validate.mockImplementation(async (code: string) => ({ code: code || null, subtotal: 200, discountAmount: code ? 20 : 0, total: code ? 180 : 200, deliveryFee: 0 }));
});
afterEach(cleanup);

describe('quantity and checkout selection', () => {
  it('lets a buyer clear and type quantity, enforcing limits on blur', () => {
    function Control() { const [value, setValue] = useState(1); return <QuantitySelector value={value} max={5} onChange={setValue} />; }
    mount(<Control />);
    const input = screen.getByRole('spinbutton', { name: 'Quantity' });
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '4' } });
    expect(input).toHaveValue(4);
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(input).toHaveValue(5);
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(5);
  });

  it('separates variants and sums only authoritative selected line totals', () => {
    const variant = { ...cart.items[0], id: 'other-variant', variantId: 'large', lineTotal: 345 };
    const selected = selectedCart({ ...cart, items: [...cart.items, variant] }, [cartLineKey(cart.items[0]), cartLineKey(cart.items[1])]);
    expect(selected.items).toEqual([variant]);
    expect(selected.subtotal).toBe(345);
  });

  it('unselecting an unavailable product enables checkout and updates summary', async () => {
    mount(<BagScreen />);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Tea for checkout' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled());
    expect(screen.getByText('Subtotal (2 selected units)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Honey for checkout' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByText('Select at least one product to continue.')).toBeInTheDocument();
  });

  it('submits selected IDs and coupon without client money, retains key only for unchanged retries', async () => {
    useCheckoutStore.getState().setSelectedAddress('addr');
    useCheckoutStore.getState().setLineSelected('buyer', cartLineKey(cart.items[1]), false);
    mount(<PaymentScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    const first = mocks.placeOrder.mock.calls[0][0];
    expect(first.cartItemIds).toEqual(['line-a']);
    expect(first).not.toHaveProperty('subtotal');
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(mocks.placeOrder.mock.calls[1][0].idempotencyKey).toBe(first.idempotencyKey);
    fireEvent.change(screen.getByLabelText('Have an offer or coupon?'), { target: { value: 'SAVE' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.getByText('SAVE applied. You save ₹20.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(mocks.placeOrder.mock.calls[2][0]).toMatchObject({ cartItemIds: ['line-a'], couponCode: 'SAVE' });
    expect(mocks.placeOrder.mock.calls[2][0].idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('invalid coupon blocks ordering until removed', async () => {
    mocks.validate.mockImplementation(async (code: string) => { if (code) throw new Error('Coupon expired'); return { code: null, subtotal: 200, discountAmount: 0, total: 200, deliveryFee: 0 }; });
    useCheckoutStore.getState().setSelectedAddress('addr');
    useCheckoutStore.getState().setLineSelected('buyer', cartLineKey(cart.items[1]), false);
    mount(<PaymentScreen />);
    fireEvent.change(screen.getByLabelText('Have an offer or coupon?'), { target: { value: 'OLD' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove coupon' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled());
  });

  it('does not inherit another account selection or coupon', () => {
    useCheckoutStore.getState().setLineSelected('another-user', cartLineKey(cart.items[0]), false);
    useCheckoutStore.getState().setCouponCode('another-user', 'PRIVATE');
    mount(<BagScreen />);
    expect(screen.getByRole('checkbox', { name: 'Select Honey for checkout' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Remove coupon' })).not.toBeInTheDocument();
  });

  it('can retry the same coupon after a temporary validation failure', async () => {
    let failed = false; mocks.validate.mockImplementation(async (code: string) => { if (code && !failed) { failed = true; throw new Error('Temporary error'); } return { code: code || null, subtotal: 200, discountAmount: code ? 20 : 0, total: code ? 180 : 200, deliveryFee: 0 }; });
    useCheckoutStore.getState().setLineSelected('buyer', cartLineKey(cart.items[1]), false);
    mount(<BagScreen />);
    fireEvent.change(screen.getByLabelText('Have an offer or coupon?'), { target: { value: 'save' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.getByText('SAVE applied. You save ₹20.')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled());
  });
});

describe('account navigation', () => {
  it('provides logout in mobile menu using the real auth action', async () => {
    mount(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
  });

  it('removes account settings from the signed-in menu', () => {
    mount(<AccountMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'My Account' }));
    expect(screen.queryByRole('link', { name: 'settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'saved addresses' })).toBeInTheDocument();
  });
});
