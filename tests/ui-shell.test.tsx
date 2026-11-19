import React from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { renderWithRedux as render } from './redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '@/store/redux';
import { MobileNav } from '@/components/layout/MobileNav';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { CheckoutItems } from '@/components/checkout/CheckoutItems';
import { authChanged } from '@/store/auth.store';

let store: ReturnType<typeof makeStore>;

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/image', () => ({ default: ({ fill: _fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img {...props} /> }));

beforeEach(() => {
  store = makeStore();
  store.dispatch(authChanged({ status: 'anonymous', isLoggedIn: false, user: null }));
});
afterEach(cleanup);

describe('auth-aware navigation', () => {
  it('keeps the four browsing tabs and switches the account tab immediately', () => {
    render(<MobileNav />, { store });
    const navigation = within(screen.getByRole('navigation', { name: 'Bottom navigation' }));
    const browsingTabs = [
      ['Home', '/'],
      ['Categories', '/products'],
      ['Search', '/search'],
      ['Wishlist', '/wishlist'],
    ];
    for (const [name, href] of browsingTabs) {
      expect(navigation.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    expect(screen.queryByRole('link', { name: 'My Account' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(store.getState().authModal.isOpen).toBe(true);
    act(() => store.dispatch(authChanged({ status: 'authenticated', isLoggedIn: true })));
    expect(screen.queryByRole('button', { name: 'Account' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Account' })).toHaveAttribute('href', '/account');
    for (const [name, href] of browsingTabs) {
      expect(navigation.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    act(() => store.dispatch(authChanged({ status: 'anonymous', isLoggedIn: false })));
    expect(screen.queryByRole('link', { name: 'My Account' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account' })).toBeVisible();
  });

  it('renders neither auth identity while restoring a session', () => {
    store.dispatch(authChanged({ status: 'restoring', isLoggedIn: false }));
    render(<><MobileNav /><AccountMenu /></>, { store });
    expect(screen.queryByRole('button', { name: 'Account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'My Account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Account' })).not.toBeInTheDocument();
  });
});

it('shows every authoritative checkout item with its image, quantity and line total', () => {
  render(<CheckoutItems items={[
    { id: 'a', productId: 'p1', productName: 'Honey', imageUrl: '/honey.webp', unitPrice: 120, quantity: 2, totalPrice: 240 },
    { id: 'b', productId: 'p2', productName: 'Tea', imageUrl: '/tea.webp', unitPrice: 80, quantity: 1, totalPrice: 80 },
  ]} />);
  const summary = screen.getByRole('region', { name: 'Order items' });
  expect(within(summary).getByRole('heading', { name: '3 items' })).toBeInTheDocument();
  expect(within(summary).getByRole('img', { name: 'Honey' })).toHaveAttribute('src', '/honey.webp');
  expect(within(summary).getByRole('img', { name: 'Tea' })).toHaveAttribute('src', '/tea.webp');
  expect(within(summary).getByText(/120.*× 2/)).toBeInTheDocument();
  expect(within(summary).getByText(/240/)).toBeInTheDocument();
});
