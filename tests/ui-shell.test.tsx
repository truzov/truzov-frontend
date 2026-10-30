import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileNav } from '@/components/layout/MobileNav';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { CheckoutItems } from '@/components/checkout/CheckoutItems';
import { useAuthStore } from '@/store/auth.store';
import { useAuthModalStore } from '@/store/auth-modal.store';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/image', () => ({ default: ({ fill: _fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img {...props} /> }));

beforeEach(() => {
  useAuthStore.setState({ status: 'anonymous', isLoggedIn: false, user: null });
  useAuthModalStore.getState().closeAuthModal();
});
afterEach(cleanup);

describe('auth-aware navigation', () => {
  it('shows only guest login, then switches immediately after login/logout', () => {
    const { rerender } = render(<MobileNav />);
    expect(screen.queryByRole('link', { name: 'My Account' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Login / Signup' }));
    expect(useAuthModalStore.getState().isOpen).toBe(true);
    act(() => useAuthStore.setState({ status: 'authenticated', isLoggedIn: true }));
    rerender(<MobileNav />);
    expect(screen.queryByRole('button', { name: 'Login / Signup' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Account' })).toHaveAttribute('href', '/account');
    act(() => useAuthStore.setState({ status: 'anonymous', isLoggedIn: false }));
    rerender(<MobileNav />);
    expect(screen.queryByRole('link', { name: 'My Account' })).not.toBeInTheDocument();
  });

  it('renders neither auth identity while restoring a session', () => {
    useAuthStore.setState({ status: 'restoring', isLoggedIn: false });
    render(<><MobileNav /><AccountMenu /></>);
    expect(screen.queryByText('Login / Signup')).not.toBeInTheDocument();
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
