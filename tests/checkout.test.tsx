import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/components/layout/Header';
import { AddressForm } from '@/components/checkout/AddressForm';
import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { CheckoutPriceDetails } from '@/components/checkout/CheckoutPriceDetails';
import { AddressScreen, BagScreen } from '@/components/checkout/CheckoutScreens';
import { addresses as fixtureAddresses, products } from '@/lib/data/fixtures';
import { useAddressStore } from '@/store/address.store';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useCheckoutStore } from '@/store/checkout.store';

vi.mock('next/navigation', () => ({
  usePathname: () => '/cart',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

function getFixtureProduct(id: string) {
  const product = products.find((item) => item.id === id);

  if (!product) {
    throw new Error(`Missing fixture product: ${id}`);
  }

  return product;
}

const bagProduct = getFixtureProduct('prd-001');
const addressProduct = getFixtureProduct('prd-003');

describe('checkout flow', () => {
  afterEach(() => {
    useCartStore.setState({ items: [], selectedItems: [], coupon: undefined });
    useCheckoutStore.setState({ selectedAddressId: undefined, paymentMethod: 'UPI' });
    useAuthStore.setState({
      isLoggedIn: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
      otpSessionId: null,
      pendingIdentifier: null,
    });
    useAddressStore.setState({ addresses: fixtureAddresses });
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
      expect(screen.getByRole('link', { name: /start shopping/i })).toHaveAttribute(
        'href',
        '/products'
      );
      expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();
    });
  });

  it('can disable the checkout continue action until required selections are made', async () => {
    useCartStore.setState({
      items: [{ product: products[0], quantity: 1, unitPrice: products[0].price }],
      coupon: undefined,
    });

    render(
      <CheckoutPriceDetails
        ctaLabel="Continue"
        disabled
        helperText="Select or add an address to continue."
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
      expect(screen.getByText('Select or add an address to continue.')).toBeInTheDocument();
    });
  });

  it('shows delivery estimates only for selected bag items on the address page', async () => {
    useAuthStore.setState({ isLoggedIn: true });
    useCartStore.setState({
      items: [
        { product: bagProduct, quantity: 1, unitPrice: bagProduct.price },
        { product: addressProduct, quantity: 1, unitPrice: addressProduct.price },
      ],
      selectedItems: [addressProduct.id],
      coupon: undefined,
    });

    render(<AddressScreen />);

    await waitFor(() => {
      expect(screen.getByText(/price details \(1 item\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/estimated delivery by/i)).toHaveLength(1);
    });
  });

  it('renders delivery addresses as a native radio group with a selected default address', async () => {
    useAuthStore.setState({ isLoggedIn: true });
    useCartStore.setState({
      items: [{ product: bagProduct, quantity: 1, unitPrice: bagProduct.price }],
      selectedItems: [bagProduct.id],
      coupon: undefined,
    });

    render(<AddressScreen />);

    await waitFor(() => {
      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      expect(radios.length).toBeGreaterThan(0);
      expect(radios.some((radio) => radio.checked)).toBe(true);
      expect(screen.getByRole('radiogroup', { name: /delivery addresses/i })).toBeInTheDocument();
    });
  });

  it('clears validation errors once a user corrects an invalid field', async () => {
    const user = userEvent.setup();

    render(<AddressForm onComplete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /save address/i }));

    expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), 'Asha Verma');

    await waitFor(() => {
      expect(screen.queryByText(/name must be at least 2 characters/i)).not.toBeInTheDocument();
    });
  });
});
