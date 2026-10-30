import { apiRequest } from '@/lib/api/client';
import type { PagedData } from '@/types/api';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  type: 'account' | 'payment' | 'order' | 'product' | 'other';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  orderNumber?: string | null;
}

export interface TicketDetail {
  ticket: SupportTicket;
  messages: { id: string; senderName: string; fromAdmin: boolean; body: string; attachmentUrl?: string | null; createdAt: string }[];
}

export function listTickets(page = 1, signal?: AbortSignal): Promise<PagedData<SupportTicket>> {
  return apiRequest('/support/tickets', { auth: true, query: { page, limit: 20 }, signal });
}

export function openTicket(body: { type: SupportTicket['type']; subject: string; body: string; orderNumber?: string; attachmentDocId?: string }): Promise<TicketDetail> {
  return apiRequest('/support/tickets', { method: 'POST', auth: true, body });
}

/** Private, content-validated attachment; the server checks upload ownership on ticket creation. */
export async function uploadTicketImage(file: File): Promise<{ docId: string }> {
  const body = new FormData();
  body.set('file', file);
  return apiRequest('/support/attachments', { method: 'POST', auth: true, body });
}

export function getTicket(id: string, signal?: AbortSignal): Promise<TicketDetail> {
  return apiRequest(`/support/tickets/${encodeURIComponent(id)}`, { auth: true, signal });
}

export function replyToTicket(id: string, body: string): Promise<TicketDetail> {
  return apiRequest(`/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', auth: true, body: { body } });
}

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
