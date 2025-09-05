import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { API_BASE, getAuthToken, setAuthToken, onUnauthorized } from '../services/api';

const AUTH_CHANGED = 'auth:changed';

type UnauthorizedOff = () => void;

type AuthContextValue = {
  authReady: boolean;
  isAuthed: boolean;
  token: string | null;
  setToken: (t: string | null) => void;
  saveToken: (t: string) => void;
  loginGoogle: () => void;
  loginGitHub: () => void;
  logout: () => void;
};

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

/**
 * Wrap your app with this provider (in main.tsx).
 * - Uses explicit `authReady` so guards can wait.
 * - Loads token after mount (prevents Safari bounce).
 * - Syncs across tabs and same tab.
 * - Clears auth on global 401/403 via onUnauthorized().
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const mounted = useRef(false);

  const setToken = useCallback((t: string | null) => {
    setAuthToken(t);
    setTokenState(t);
    // same-tab broadcast
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED));
  }, []);

  const saveToken = useCallback((t: string) => setToken(t), [setToken]);

  const loginGoogle = useCallback(() => {
    // Backend redirects to /auth/callback?token=...
    window.location.assign(`${API_BASE}/auth/google`);
  }, []);
  const loginGitHub = useCallback(() => {
    window.location.assign(`${API_BASE}/auth/github`);
  }, []);
  const logout = useCallback(() => setToken(null), [setToken]);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    // 1) Load token AFTER mount; then mark ready (prevents guard race).
    setTokenState(getAuthToken());
    Promise.resolve().then(() => setAuthReady(true)); // microtask for Safari flush

    // 2) Clear auth on global 401/403
    const offUnauthorized: UnauthorizedOff = onUnauthorized(() => setToken(null));

    // 3) Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') setTokenState(getAuthToken());
    };
    window.addEventListener('storage', onStorage);

    // 4) Same-tab programmatic sync
    const sync = () => setTokenState(getAuthToken());
    window.addEventListener(AUTH_CHANGED, sync);

    return () => {
      offUnauthorized?.();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_CHANGED, sync);
    };
  }, [setToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authReady,
      isAuthed: !!token,
      token,
      setToken,
      saveToken,
      loginGoogle,
      loginGitHub,
      logout,
    }),
    [authReady, token, setToken, saveToken, loginGoogle, loginGitHub, logout]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/** Use this inside components to read/update auth state. */
export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * Use on the OAuth callback route.
 * Stores token from URL (query or hash), then hard-replaces to /dashboard.
 * The timeout ensures storage/event flush before navigation (iOS/Safari).
 */
export function useAuthCallback() {
  useEffect(() => {
    const url = new URL(window.location.href);

    const fromSearch =
      url.searchParams.get('token') ||
      url.searchParams.get('jwt') ||
      url.searchParams.get('access_token') ||
      url.searchParams.get('t');

    // legacy support: #token=...
    let fromHash: string | null = null;
    if (!fromSearch && url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      fromHash =
        hashParams.get('token') ||
        hashParams.get('jwt') ||
        hashParams.get('access_token') ||
        hashParams.get('t');
    }

    const tok = fromSearch || fromHash;

    if (tok) {
      setAuthToken(tok);
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED));
      setTimeout(() => window.location.replace('/dashboard'), 0);
    } else {
      window.location.replace('/');
    }
  }, []);
}
