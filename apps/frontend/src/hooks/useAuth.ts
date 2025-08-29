import { useCallback, useEffect, useState } from 'react';
import { API_BASE, getAuthToken, setAuthToken, onUnauthorized } from '../services/api';

const AUTH_CHANGED = 'auth:changed';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());

  const setToken = useCallback((t: string | null) => {
    setAuthToken(t);
    setTokenState(t);
    // notify all hook instances (same tab)
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED));
  }, []);

  // alias kept for existing code
  const saveToken = useCallback((t: string) => setToken(t), [setToken]);

  const loginGoogle = useCallback(() => {
    window.location.assign(`${API_BASE}/auth/google`);
  }, []);
  const loginGitHub = useCallback(() => {
    window.location.assign(`${API_BASE}/auth/github`);
  }, []);
  const logout = useCallback(() => setToken(null), [setToken]);

  useEffect(() => {
    // if any request returns 401/403, clear token everywhere
    const offUnauthorized = onUnauthorized(() => setToken(null));

    // keep all hook instances in sync
    const sync = () => setTokenState(getAuthToken());
    window.addEventListener(AUTH_CHANGED, sync);
    // NOTE: native "storage" doesn't fire in the same tab; we rely on AUTH_CHANGED

    return () => {
      offUnauthorized();
      window.removeEventListener(AUTH_CHANGED, sync);
    };
  }, [setToken]);

  return {
    isAuthed: !!token,
    token,
    setToken,
    saveToken,
    loginGoogle,
    loginGitHub,
    logout,
  };
}

/** Optional helper if you read ?token= on a page and want to persist it. */
export function useAuthCallback() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token');
    if (t) {
      setAuthToken(t);
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED));
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, []);
}
