import { http, HttpResponse } from 'msw';
import {
  addresses,
  adminMetrics,
  banners,
  categories,
  labReports,
  orders,
  products,
  reviews,
  users,
  vendors,
  verificationSubmissions,
} from '@/lib/data/fixtures';

const ok = <T>(data: T, message?: string) => HttpResponse.json({ data, message });

export const handlers = [
  http.get('*/products', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const data = category ? products.filter((product) => product.category === category) : products;
    return ok({ items: data, total: data.length, page: 1, limit: 24 });
  }),
  http.get('*/products/:slug', ({ params }) => ok(products.find((product) => product.slug === params.slug))),
  http.get('*/products/:slug/reviews', () => ok({ items: reviews, total: reviews.length, page: 1, limit: 10 })),
  http.get('*/categories', () => ok(categories)),
  http.get('*/search', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    return ok(products.filter((product) => product.name.toLowerCase().includes(q)));
  }),
  http.get('*/banners', () => ok(banners)),
  http.get('*/cart', () => ok([])),
  http.post('*/cart/sync', () => ok({ synced: true })),
  http.post('*/cart/add', () => ok({ added: true })),
  http.post('*/cart/remove', () => ok({ removed: true })),
  http.post('*/cart/apply-coupon', () => ok({ code: 'TRUZOV10', discount: 100 })),
  http.post('*/checkout/initiate', () => ok({ id: 'checkout-mock' })),
  http.post('*/checkout/confirm', () => ok(orders[0])),
  http.get('*/orders', () => ok(orders)),
  http.get('*/orders/:id', ({ params }) => ok(orders.find((order) => order.id === params.id) ?? orders[0])),
  http.get('*/user/profile', () => ok(users[0])),
  http.get('*/user/addresses', () => ok(addresses)),
  http.post('*/auth/login', () => ok(users[0])),
  http.post('*/auth/register', () => ok(users[0])),
  http.post('*/auth/logout', () => ok({ loggedOut: true })),
  http.get('*/auth/me', () => ok(users[0])),
  http.post('*/wishlist/toggle', () => ok({ toggled: true })),
  http.get('*/vendor/products', () => ok(products)),
  http.get('*/vendor/orders', () => ok(orders)),
  http.get('*/vendor/verification', () => ok(verificationSubmissions)),
  http.get('*/admin/metrics', () => ok(adminMetrics)),
  http.get('*/admin/vendors', () => ok(vendors)),
  http.get('*/admin/products', () => ok(products)),
  http.get('*/admin/verification', () => ok(verificationSubmissions)),
  http.get('*/lab/reports', () => ok(labReports)),
  http.get('*/lab/requests', () => ok(verificationSubmissions)),
];
