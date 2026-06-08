import type { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('truzov-auth');
    return raw ? (JSON.parse(raw) as { state?: { token?: string | null } }).state?.token ?? null : null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(body?.message ?? body?.error ?? `API request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<T> | T;
  return 'data' in (payload as ApiResponse<T>) ? (payload as ApiResponse<T>).data : (payload as T);
}
