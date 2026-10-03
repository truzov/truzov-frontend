import { apiRequest } from '@/lib/api/client';

export interface SellerApplicationRequest {
  brand: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  website?: string;
  gstin?: string;
  about?: string;
}

export interface SellerApplicationReceipt {
  id: string;
  submittedAt: string;
}

/** Public onboarding request, persisted separately from signed-in support tickets. */
export function submitSellerApplication(body: SellerApplicationRequest): Promise<SellerApplicationReceipt> {
  return apiRequest<SellerApplicationReceipt>('/support/seller-applications', {
    method: 'POST',
    body,
  });
}
