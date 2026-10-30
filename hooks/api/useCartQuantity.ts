'use client';

import { useRef } from 'react';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/hooks/api/useCart';
import { addCartItem, updateCartItem, removeCartItem } from '@/lib/api/endpoints/cart';
import { queryKeys } from '@/lib/api/queries';
import { errorMessage } from '@/lib/api/errors';
import { useGuestCartStore } from '@/lib/cart/guest-cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import type { CartDto, CartItemDto } from '@/types/api';

export type CartProduct = { productId: string; variantId?: string; productName: string; slug: string; imageUrl?: string; unitPrice: number; availableStock?: number };
const same = (line: Pick<CartItemDto, 'productId' | 'variantId'>, product: CartProduct) => line.productId === product.productId && (line.variantId ?? '') === (product.variantId ?? '');
const totals = (items: CartItemDto[]): CartDto => ({ items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0) });

export function useCartQuantity(product: CartProduct) {
  const client = useQueryClient();
  const owner = useAuthStore((state) => state.user?.id);
  const loggedIn = useAuthStore((state) => state.isLoggedIn);
  const guestItems = useGuestCartStore((state) => state.items);
  const { cart, isLoading } = useCart();
  const locked = useRef(false);
  // ponytail: serialize cart writes because each response replaces the complete cart.
  const writes = useIsMutating({ mutationKey: ['cart-write'] });
  const requireOwner = () => {
    if (!useAuthStore.getState().isLoggedIn || useAuthStore.getState().user?.id !== owner) throw new Error('Your account changed. Please try again.');
  };
  const mutation = useMutation({
    mutationKey: ['cart-write'],
    mutationFn: async ({ next, line }: { next: number; line?: CartItemDto }) => {
      requireOwner();
      return line ? next === 0 ? removeCartItem(line.id) : updateCartItem(line.id, { quantity: next })
        : addCartItem({ productId: product.productId, variantId: product.variantId, quantity: next });
    },
    onMutate: async ({ next }) => {
      requireOwner();
      await client.cancelQueries({ queryKey: queryKeys.cart() });
      requireOwner();
      const previous = client.getQueryData<CartDto>(queryKeys.cart());
      const items = [...(previous?.items ?? [])];
      const index = items.findIndex((line) => same(line, product));
      if (index >= 0) {
        items[index] = { ...items[index], quantity: next, lineTotal: items[index].unitPrice * next };
      } else if (next) {
        items.push({ ...product, id: `pending:${product.productId}:${product.variantId ?? ''}`, name: product.productName, quantity: next, lineTotal: product.unitPrice * next, inStock: true, availableStock: next });
      }
      client.setQueryData(queryKeys.cart(), totals(items.filter((line) => line.quantity > 0)));
      return { previous, owner };
    },
    onSuccess: (next, _variables, context) => {
      if (useAuthStore.getState().user?.id === context?.owner) client.setQueryData(queryKeys.cart(), next);
    },
    onError: (error, _variables, context) => {
      if (useAuthStore.getState().user?.id === context?.owner) client.setQueryData(queryKeys.cart(), context?.previous ?? { items: [], itemCount: 0, subtotal: 0 });
      useUiStore.getState().addToast({ type: 'error', title: 'Could not update cart', message: errorMessage(error) });
    },
    onSettled: () => { locked.current = false; },
  });
  const serverLine = cart.items.find((line) => same(line, product));
  const quantity = (loggedIn ? serverLine : guestItems.find((line) => same(line, product)))?.quantity ?? 0;
  const change = (next: number) => {
    if (locked.current || client.isMutating({ mutationKey: ['cart-write'] }) || !Number.isInteger(next) || next < 0 || next > 20) return;
    if (!loggedIn) {
      const store = useGuestCartStore.getState();
      if (quantity) store.setQuantity(product.productId, product.variantId, next);
      else if (next) store.add({ productId: product.productId, variantId: product.variantId, name: product.productName, slug: product.slug, imageUrl: product.imageUrl, unitPrice: product.unitPrice, availableStock: product.availableStock, quantity: next });
      return;
    }
    if (isLoading) return;
    locked.current = true;
    mutation.mutate({ next, line: cart.items.find((line) => same(line, product)) });
  };
  return { quantity, availableStock: loggedIn ? serverLine?.availableStock : undefined, pending: Boolean(writes) || mutation.isPending || (loggedIn && isLoading), change };
}
