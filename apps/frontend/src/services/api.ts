// apps/frontend/src/services/api.ts
import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

/**
 * BACKEND BASE URL STRATEGY
 * - Prefer VITE_API_URL (e.g., https://your-backend.onrender.com)
 * - Otherwise fall back to the current origin (useful if you proxy /api via Netlify)
 * - Ensure the final base ends with /api
 *
 * Netlify: set VITE_API_URL in Site Settings, or add a netlify.toml proxy for /api.
 */
const ENV_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const ORIGIN_BASE =
  typeof window !== 'undefined' && window.location ? window.location.origin : '';

const RAW_BASE = ENV_BASE && ENV_BASE.length > 0 ? ENV_BASE : ORIGIN_BASE;

const NORMALIZED = RAW_BASE.replace(/\/$/, '');
export const API_BASE = /\/api$/.test(NORMALIZED)
  ? NORMALIZED
  : `${NORMALIZED}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  // If you rely on cookies/SameSite=None, uncomment:
  // withCredentials: true,
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
