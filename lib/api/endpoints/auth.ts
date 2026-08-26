import { apiRequest } from '@/lib/api/client';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LogoutRequest,
  OtpSendRequest,
  OtpSendResponse,
  OtpVerifyRequest,
  SignupRequest,
  SignupResponse,
  TokenResponse,
  UpdateProfileRequest,
  UserProfileDto,
} from '@/types/api';

/**
 * Auth and own-account endpoints.
 *
 * Note there is no `refresh` here on purpose. Token refresh lives inside lib/api/client.ts,
 * because it has to run *during* a failed request and be de-duplicated across concurrent
 * callers. Exposing a second way to refresh would let a caller rotate the refresh token behind
 * the client's back and invalidate the token the client is about to use.
 */

/**
 * Creates a customer account and dispatches an OTP. Returns 201 with an OTP session and
 * NO TOKENS — the account is not usable until the code is verified.
 */
export function signup(body: SignupRequest): Promise<SignupResponse> {
  return apiRequest<SignupResponse>('/auth/signup', { method: 'POST', body });
}

/**
 * Sends or resends a code.
 *
 * The response is deliberately identical for known and unknown identifiers so the endpoint
 * cannot be used to enumerate accounts. Callers must keep UI copy neutral and must never say
 * "no account found" — doing so would rebuild the oracle the backend is avoiding.
 */
export function sendOtp(body: OtpSendRequest): Promise<OtpSendResponse> {
  return apiRequest<OtpSendResponse>('/auth/otp/send', { method: 'POST', body });
}

/** Wrong code is 400 OTP_INVALID (session still usable); expired/used is 410 OTP_EXPIRED. */
export function verifyOtp(body: OtpVerifyRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/otp/verify', { method: 'POST', body });
}

export function login(body: LoginRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', { method: 'POST', body });
}

export function getCurrentUser(signal?: AbortSignal): Promise<UserProfileDto> {
  return apiRequest<UserProfileDto>('/auth/me', { auth: true, signal });
}

/** Revokes the refresh session server-side. Returns 204. */
export function logout(body?: LogoutRequest): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST', auth: true, body: body ?? {} });
}

/**
 * Only these four fields are accepted. Sending anything else is a hard 400 — the backend runs
 * `fail-on-unknown-properties: true`, so an undocumented field is rejected rather than ignored.
 *
 * Changing email or phone clears that channel's verification, which means the next
 * verification-gated call (checkout, for one) can come back 403 PHONE_NOT_VERIFIED.
 */
export function updateProfile(body: UpdateProfileRequest): Promise<UserProfileDto> {
  return apiRequest<UserProfileDto>('/users/me', { method: 'PATCH', auth: true, body });
}

/**
 * Returns 204 and revokes ALL refresh tokens, so the current session dies too. Callers must
 * clear local auth state and send the user back to sign in rather than pretending they are
 * still logged in with a token the server no longer honours.
 */
export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return apiRequest<void>('/users/me/password', { method: 'POST', auth: true, body });
}
