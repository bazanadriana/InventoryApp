// frontend/src/services/api.ts
import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

/** Always point to `/api` (avoid double slashes). */
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000') as string;
const API_ROOT =
  RAW_BASE.endsWith('/api') || RAW_BASE.endsWith('/api/')
    ? RAW_BASE.replace(/\/$/, '')
    : `${RAW_BASE.replace(/\/$/, '')}/api`;

/** Exported so the app can build OAuth URLs like `${API_BASE}/auth/google`. */
export const API_BASE = API_ROOT;

/** Axios instance for your backend. */
export const api = axios.create({
  baseURL: API_BASE,
});

/* ---------------- Token helpers ---------------- */
export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function setAuthToken(token?: string | null) {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common.Authorization;
  }
}

/* Attach freshest token on every request (Axios v1-safe). */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const t = getAuthToken();
  if (t) {
    const headers: any = config.headers ?? {};
    if (typeof headers.set === 'function') {
      headers.set('Authorization', `Bearer ${t}`);
    } else {
      config.headers = { ...headers, Authorization: `Bearer ${t}` } as any;
    }
  }
  return config;
});

/* Broadcast 401/403; pages decide what to do. */
export function onUnauthorized(handler: () => void) {
  const listener = () => handler();
  window.addEventListener('auth:unauthorized', listener);
  return () => window.removeEventListener('auth:unauthorized', listener);
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(err);
  }
);

/* Initialize defaults on app load. */
setAuthToken(getAuthToken());
