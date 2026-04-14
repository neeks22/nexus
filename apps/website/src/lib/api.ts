'use client';

/**
 * Shared fetch wrapper for CRM API calls.
 * Tenant is derived server-side from the session cookie — no need to pass it.
 */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

/** GET helper — appends query params, returns typed JSON */
export function apiGet<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== '') url.searchParams.set(key, val);
    }
  }
  return apiFetch<T>(url.pathname + url.search);
}

/** POST helper */
export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

/** PATCH helper */
export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE helper */
export function apiDelete<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE', body: JSON.stringify(body) });
}
