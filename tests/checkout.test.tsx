import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/components/layout/Header';
import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { CheckoutPriceDetails } from '@/components/checkout/CheckoutPriceDetails';
import { BagScreen } from '@/components/checkout/CheckoutScreens';
import { products } from '@/lib/data/fixtures';
import { useCartStore } from '@/store/cart.store';

vi.mock('next/navigation', () => ({
  usePathname: () => '/cart',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('checkout flow', () => {
  afterEach(() => {
    useCartStore.setState({ items: [], coupon: undefined });
  });

  it('links the cart icon to the dedicated bag page', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByLabelText('Open cart')).toHaveAttribute('href', '/cart');
      expect(screen.getByText('Cart').closest('a')).toHaveAttribute('href', '/cart');
    });
  });

  it('renders the Bag, Address, Payment checkout progress', () => {
    render(<CheckoutProgress active={1} />);

    expect(screen.getByText('Bag')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
  });

  it('shows an empty bag state instead of a checkout CTA', async () => {
    render(<BagScreen />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /your bag is empty/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /start shopping/i })).toHaveAttribute('href', '/products');
      expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();
    });
  });

  it('can disable the checkout continue action until required selections are made', async () => {
    useCartStore.setState({
      items: [{ product: products[0], quantity: 1, unitPrice: products[0].price }],
      coupon: undefined,
    });

    render(<CheckoutPriceDetails ctaLabel="Continue" disabled helperText="Select or add an address to continue." />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
      expect(screen.getByText('Select or add an address to continue.')).toBeInTheDocument();
    });
  });
});
