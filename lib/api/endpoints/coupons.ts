import { apiRequest } from '@/lib/api/client';
import type { CouponQuote } from '@/types/api';

export function validateCoupon(code: string, cartItemIds: string[], signal?: AbortSignal) {
  return apiRequest<CouponQuote>('/coupons/validate', { method: 'POST', auth: true, body: { code, cartItemIds }, signal });
}
