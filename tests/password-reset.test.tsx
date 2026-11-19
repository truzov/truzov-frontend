import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithRedux as render } from './redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '@/store/redux';
import { authChanged } from '@/store/auth.store';
import { ResetPasswordScreen } from '@/components/screens/ResetPasswordScreen';
import { requestPasswordReset, confirmPasswordReset } from '@/lib/api/endpoints/auth';
import { sellerDestination } from '@/lib/config/seller';

let store: ReturnType<typeof makeStore>;

const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/api/endpoints/auth', () => ({ requestPasswordReset: vi.fn(), confirmPasswordReset: vi.fn() }));
vi.mock('@/lib/api/token-store', () => ({ clearSession: vi.fn() }));

beforeEach(() => {
  store = makeStore();
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('password recovery', () => {
  it('uses neutral code request and only clears the session after reset succeeds', async () => {
    store.dispatch(authChanged({ status: 'authenticated', isLoggedIn: true }));
    vi.mocked(requestPasswordReset).mockResolvedValue({ otpSessionId: 'reset-session', channel: 'email', expiresInSeconds: 300 });
    vi.mocked(confirmPasswordReset).mockRejectedValueOnce(new Error('Invalid or expired code.'));
    render(<ResetPasswordScreen />, { store });
    fireEvent.change(screen.getByLabelText('Email or phone number'), { target: { value: 'person@example.com' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send verification code' })));
    expect(requestPasswordReset).toHaveBeenCalledExactlyOnceWith('person@example.com');
    expect(screen.getByText(/If the account can receive codes/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-password-123' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reset password' })));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid or expired code.');
    expect(store.getState().auth.status).toBe('authenticated');
    expect(replace).not.toHaveBeenCalled();
    expect(store.getState().ui.toasts).toHaveLength(0);
    expect(screen.getByLabelText('New password')).toHaveValue('new-password-123');
    vi.mocked(confirmPasswordReset).mockResolvedValueOnce(undefined);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reset password' })));
    expect(confirmPasswordReset).toHaveBeenLastCalledWith({ otpSessionId: 'reset-session', code: '123456', password: 'new-password-123' });
    expect(store.getState().auth.status).toBe('anonymous');
    expect(store.getState().ui.toasts[0]).toMatchObject({ type: 'success', title: 'Your password has been changed. Sign in with your new password.' });
    expect(replace).toHaveBeenCalledExactlyOnceWith('/login');
  });
});

it('uses the seller application for guests/customers and dashboard for sellers, rejecting unsafe origins', () => {
  expect(sellerDestination('customer', 'http://localhost:3001')).toBe('http://localhost:3001/apply');
  expect(sellerDestination('vendor', 'https://seller.example.com/')).toBe('https://seller.example.com/');
  expect(sellerDestination(undefined, 'javascript:alert(1)')).toBe('/support/seller');
  expect(sellerDestination(undefined, 'https://user:password@evil.example')).toBe('/support/seller');
  expect(sellerDestination(undefined, 'https://seller.example/path?redirect=evil')).toBe('/support/seller');
});
