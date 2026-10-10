import { apiRequest } from '@/lib/api/client';
import type { CouponQuote } from '@/types/api';

export function validateCoupon(code: string, cartItemIds: string[], signal?: AbortSignal) {
  return apiRequest<CouponQuote>('/coupons/validate', { method: 'POST', auth: true, body: { code, cartItemIds }, signal });
}

export interface Offer {
  code: string;
  title: string;
  bannerUrl?: string;
  couponAmount: number;
  minAmount: number;
  shortDescription?: string;
  endDate: string;
}

export function listOffers(signal?: AbortSignal): Promise<Offer[]> {
  return apiRequest('/offers', { signal });
}
