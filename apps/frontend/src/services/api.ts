import http from './http';

/** API base used by both axios default and our http client */
export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (window.location.hostname.includes('netlify')
    ? 'https://inventoryapp-14ez.onrender.com/api'
    : 'http://localhost:4000/api');

/** Token helpers (localStorage only; no cookies) */
const TOKEN_KEY = 'token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

/** Simple bus for 401/403 -> logout */
const UNAUTH_EVENT = 'http:unauthorized';
export function onUnauthorized(handler: () => void) {
  const fn = () => handler();
  window.addEventListener(UNAUTH_EVENT, fn as any);
  return () => window.removeEventListener(UNAUTH_EVENT, fn as any);
}

/** Back-compat: some files import { api } from './api' */
export const api = http; // alias to our shared axios instance (no cookies)