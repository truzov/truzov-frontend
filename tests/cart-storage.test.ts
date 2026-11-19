import { beforeEach, expect, it } from 'vitest';
import {
  GUEST_CART_STORAGE_KEY, readGuestCart, restoreGuestCart, setGuestQuantity,
} from '@/lib/cart/guest-cart.store';
import { readCheckout, restoreCheckout, setSelectedAddress } from '@/store/checkout.store';
import { makeStore } from '@/store/redux';

const checkoutKey = 'truzov-checkout';
const guestItem = {
  productId: 'honey', name: 'Honey', slug: 'honey', unitPrice: 100,
  variantId: '500g', quantity: 2, availableStock: 5, addedAt: 1000,
};
const directItem = { ...guestItem, id: 'buy-now:honey:500g', lineTotal: 200, inStock: true };

beforeEach(() => window.localStorage.clear());

it('reads legacy carts without rewriting them and preserves both formats on mutation', () => {
  const guestJson = JSON.stringify([guestItem, null, { ...guestItem, quantity: 'bad' }]);
  const checkoutJson = JSON.stringify({ state: {
    selectedAddressId: 'saved-address',
    selectionOwner: 'buyer',
    excludedLineKeys: ['tea:', null],
    couponCode: 'OFFER',
    buyNow: directItem,
    directAttempt: { intent: 'intent', key: 'same-retry-key' },
    paymentMethod: 'unused',
  }, version: 0 });
  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, guestJson);
  window.localStorage.setItem(checkoutKey, checkoutJson);
  const store = makeStore();
  store.dispatch(restoreCheckout(readCheckout()));
  store.dispatch(restoreGuestCart(readGuestCart()));

  expect(store.getState().guestCart.items).toEqual([guestItem]);
  expect(store.getState().checkout).toMatchObject({
    selectedAddressId: 'saved-address', selectionOwner: 'buyer', excludedLineKeys: ['tea:'],
    couponCode: 'OFFER', buyNow: { id: directItem.id }, directAttempt: { key: 'same-retry-key' },
  });
  expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBe(guestJson);
  expect(window.localStorage.getItem(checkoutKey)).toBe(checkoutJson);

  store.dispatch(setGuestQuantity({ productId: 'honey', variantId: '500g', quantity: 3 }));
  store.dispatch(setSelectedAddress('new-address'));
  expect(JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)!)).toEqual([{ ...guestItem, quantity: 3 }]);
  const savedCheckout = JSON.parse(window.localStorage.getItem(checkoutKey)!);
  expect(savedCheckout).toMatchObject({ version: 0, state: { selectedAddressId: 'new-address' } });
  expect(savedCheckout.state).not.toHaveProperty('paymentMethod');
});

it('keeps usable legacy fields when a stored image or retry key is invalid', () => {
  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify([{ ...guestItem, imageUrl: 'invalid' }]));
  window.localStorage.setItem(checkoutKey, JSON.stringify({ state: {
    selectionOwner: 'buyer',
    selectedAddressId: 'saved-address',
    buyNow: directItem,
    directAttempt: { intent: 'intent', key: 'invalid\n' },
  }, version: 0 }));

  expect(readGuestCart()).toEqual([guestItem]);
  expect(readCheckout()).toMatchObject({
    selectedAddressId: 'saved-address',
    buyNow: { id: directItem.id },
    directAttempt: undefined,
  });
});
