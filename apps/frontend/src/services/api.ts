import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig, AxiosRequestHeaders } from 'axios';

/**
 * BACKEND BASE URL STRATEGY
 * - Prefer VITE_API_URL (e.g., https://your-backend.onrender.com)
 * - Otherwise fall back to current origin (useful if you proxy /api via Netlify)
 * - Ensure the final base ends with /api
 */
const ENV_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const ORIGIN_BASE =
  typeof window !== 'undefined' && window.location ? window.location.origin : '';

const RAW_BASE = ENV_BASE && ENV_BASE.length > 0 ? ENV_BASE : ORIGIN_BASE;
const NORMALIZED = RAW_BASE.replace(/\/$/, '');

// e.g. https://inventoryapp-14ez.onrender.com/api
export const API_BASE = /\/api$/.test(NORMALIZED) ? NORMALIZED : `${NORMALIZED}/api`;

/* ----------------------------------------------------------------------------
 * Single axios instance (used by parts of the app). Other modules (e.g. ./http)
 * may create their own client; they should still use the helpers below for a
 * single source of truth for the token.
 * --------------------------------------------------------------------------*/
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // ❌ no cookies; we use Authorization: Bearer
  headers: {
    Accept: 'application/json',
  },
});

/* ---------------- Token helpers (SST = localStorage key: "token") --------- */
const TOKEN_KEY = 'token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token?: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete (api.defaults.headers.common as any)?.Authorization;
    }
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

/* --------------------- Request interceptor (Axios v1-safe) ---------------- */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Belt & suspenders: never send cookies
  config.withCredentials = false;

  const t = getAuthToken();
  if (!t) return config;

  // Ensure headers exist and set Authorization without reassigning AxiosHeaders
  if (!config.headers) {
    config.headers = { Authorization: `Bearer ${t}` } as AxiosRequestHeaders;
    return config;
  }
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${t}`);
  } else {
    (config.headers as AxiosRequestHeaders).Authorization = `Bearer ${t}`;
  }
  return config;
});

/* -------------------- Unauthorized broadcast + cleanup -------------------- */
export function onUnauthorized(handler: () => void) {
  const listener = () => handler();
  // Listen to both channel names so this stays compatible with other clients
  window.addEventListener('auth:unauthorized', listener);
  window.addEventListener('http:unauthorized', listener);
  return () => {
    window.removeEventListener('auth:unauthorized', listener);
    window.removeEventListener('http:unauthorized', listener);
  };
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      // Clear stored token and notify listeners
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      window.dispatchEvent(new CustomEvent('http:unauthorized'));
    }
    return Promise.reject(err);
  }
);

/* ------------------------ Initialize default header ----------------------- */
setAuthToken(getAuthToken());