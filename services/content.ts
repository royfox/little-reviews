import { MediaReview } from '../types';

export interface AuthStatus {
  configured: boolean;
  authenticated: boolean;
  username: string | null;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const isJson = response.headers.get('Content-Type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

export const loadReviews = () => api<MediaReview[]>('/api/reviews');
export const getAuthStatus = () => api<AuthStatus>('/api/auth/status');

export const setupAccount = (username: string, password: string) =>
  api<{ authenticated: true; username: string }>('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const login = (username: string, password: string) =>
  api<{ authenticated: true; username: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const logout = () => api<{ authenticated: false }>('/api/auth/logout', { method: 'POST' });

export const createReview = (review: Omit<MediaReview, 'id' | 'reviewDate' | 'updatedDate'>) =>
  api<MediaReview>('/api/reviews', { method: 'POST', body: JSON.stringify(review) });

export const updateReview = (id: string, review: Omit<MediaReview, 'id' | 'reviewDate' | 'updatedDate'>) =>
  api<MediaReview>(`/api/reviews/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(review) });

export const deleteReview = (id: string) =>
  api<{ deleted: true }>(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
