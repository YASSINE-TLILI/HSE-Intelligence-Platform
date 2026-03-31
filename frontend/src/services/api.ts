import { readApiResponse } from './http';
import { AUTH_USER_KEY } from '../constants';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

function getStoredUserId(): number | null {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as {
      id?: number | string;
      id_user?: number | string;
      userId?: number | string;
    };
    const candidate = user.id ?? user.id_user ?? user.userId;
    if (candidate === undefined || candidate === null || candidate === '') return null;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), options);
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const userId = getStoredUserId();
  if (userId) {
    headers.set('X-User-Id', String(userId));
  }
  const response = await apiFetch(path, { ...options, headers });
  return readApiResponse(response) as Promise<T>;
}

export function getCurrentUserId(): number | null {
  return getStoredUserId();
}