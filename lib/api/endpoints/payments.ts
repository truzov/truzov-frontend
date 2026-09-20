import { apiRequest } from '@/lib/api/client';
import type {
  CreatePaymentSessionRequest,
  MockPaymentCompletionRequest,
  PaymentSessionDto,
} from '@/types/api';

/**
 * Opens a payment for an order that already exists.
 *
 * A separate step after `POST /checkout` rather than part of it. The amount is not sent: the
 * server reads it from the order total, so this client cannot propose what it would like to pay.
 *
 * A 403 means the order is missing or belongs to someone else — the server answers both
 * identically so the endpoint cannot be used to discover which order ids exist. A 409 means the
 * order is already paid.
 *
 * Calling this twice for the same order returns the SAME session rather than opening a second one,
 * so a customer who abandons the payment page and comes back resumes their attempt.
 *
 * @param idempotencyKey optional but recommended. With one, a retry after a network timeout
 *        replays the original response instead of risking a second session.
 */
export function createPaymentSession(
  body: CreatePaymentSessionRequest,
  idempotencyKey?: string
): Promise<PaymentSessionDto> {
  return apiRequest<PaymentSessionDto>('/payments/sessions', {
    method: 'POST',
    auth: true,
    body,
    idempotencyKey,
  });
}

/**
 * Simulates the customer completing or abandoning a payment. **Development only.**
 *
 * This route does not exist when a real gateway is configured — the backend registers the handler
 * only under the mock provider, so it answers 404 rather than merely refusing. It is therefore safe
 * to ship this function: it cannot do anything in an environment that takes real money.
 *
 * Returns nothing (204) on purpose. The order's payment status must be re-read from the server,
 * because the value that matters is the one the webhook wrote — not this call's opinion of it.
 */
export function completeMockPayment(
  sessionId: string,
  body: MockPaymentCompletionRequest
): Promise<void> {
  return apiRequest<void>(
    `/payments/mock/${encodeURIComponent(sessionId)}/complete`,
    { method: 'POST', auth: true, body }
  );
}
