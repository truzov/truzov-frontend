import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SellerSupportScreen } from '@/components/screens/SupportScreens';
import { submitSellerApplication } from '@/lib/api/endpoints/support';
import { apiRequest } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ apiRequest: vi.fn() }));

function completeForm() {
  fireEvent.change(screen.getByLabelText('Brand / company name'), { target: { value: 'Forest Foods' } });
  fireEvent.change(screen.getByLabelText('Contact person'), { target: { value: 'Asha Singh' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@example.com' } });
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '9876543210' } });
  fireEvent.change(screen.getByLabelText(/Primary product category/), { target: { value: 'Health Food & Drinks' } });
}

describe('seller application submission', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('posts public form data and displays the persisted reference only after success', async () => {
    let resolve!: (value: { id: string; submittedAt: string }) => void;
    vi.mocked(apiRequest).mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<SellerSupportScreen />);
    completeForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(screen.queryByText('Application received!')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submitting application' })).toBeDisabled();
    expect(screen.getByLabelText('Contact person')).toBeDisabled();
    expect(apiRequest).toHaveBeenCalledExactlyOnceWith('/support/seller-applications', {
      method: 'POST',
      body: { brand: 'Forest Foods', contact: 'Asha Singh', email: 'asha@example.com', phone: '9876543210', category: 'Health Food & Drinks' },
    });
    // Repeated submit events while pending cannot create duplicate applications.
    fireEvent.submit(screen.getByLabelText('Contact person').closest('form')!);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ id: 'application-42', submittedAt: '2026-10-04T00:00:00Z' }));
    expect(await screen.findByText('Application received!')).toBeInTheDocument();
    expect(screen.getByText(/Application reference: application-42/)).toBeInTheDocument();
  });

  it('shows server failures without losing entered data and allows retry', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Please wait before submitting again.'));
    render(<SellerSupportScreen />);
    completeForm();
    fireEvent.change(screen.getByLabelText('Tell us about your brand (optional)'), { target: { value: 'We grow herbs.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait before submitting again.');
    expect(screen.getByLabelText('Brand / company name')).toHaveValue('Forest Foods');
    expect(screen.getByLabelText('Tell us about your brand (optional)')).toHaveValue('We grow herbs.');
    expect(screen.queryByText('Application received!')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit application' })).toBeEnabled());
    vi.mocked(apiRequest).mockResolvedValueOnce({ id: 'retry-42', submittedAt: '2026-10-04T00:00:00Z' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText(/Application reference: retry-42/)).toBeInTheDocument();
  });

  it('rejects invalid required contact fields before reaching the endpoint', () => {
    render(<SellerSupportScreen />);
    completeForm();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('rejects invalid phone digits and website credentials without sending personal data', () => {
    render(<SellerSupportScreen />);
    completeForm();
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: 'call-me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(screen.getByRole('alert')).toHaveTextContent('7–15 digits');
    expect(apiRequest).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+91 9876543210' } });
    fireEvent.change(screen.getByLabelText('Website / social (optional)'), { target: { value: 'https://user:pass@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(screen.getByRole('alert')).toHaveTextContent('without embedded login details');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('keeps the API endpoint public rather than attaching a session token', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ id: 'public-42', submittedAt: '2026-10-04T00:00:00Z' });
    await submitSellerApplication({ brand: 'Forest Foods', contact: 'Asha', email: 'asha@example.com', phone: '9876543210', category: 'Other' });
    expect(vi.mocked(apiRequest).mock.calls[0][1]).not.toHaveProperty('auth', true);
  });
});
