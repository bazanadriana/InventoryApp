import { useCallback, useEffect, useState } from 'react';
import { API_BASE, getAuthToken, setAuthToken, onUnauthorized } from '../services/api';

const AUTH_CHANGED = 'auth:changed';

/**
 * Centralized auth hook.
 * - Reads/writes token via services/api helpers
 * - Broadcasts changes via CustomEvent and syncs across tabs via `storage`
 * - Subscribes to global 401/403 handler (onUnauthorized) to clear auth
 */
export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());

  const setToken = useCallback((t: string | null) => {
    setAuthToken(t);
    setTokenState(t);
    // notify the app (same tab)
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED));
  }, []);

  const saveToken = useCallback((t: string) => setToken(t), [setToken]);

  const loginGoogle = useCallback(() => {
    // Backend should redirect back to your OAuth callback with ?token=...
    window.location.assign(`${API_BASE}/auth/google`);
  }, []);
  const loginGitHub = useCallback(() => {
    window.location.assign(`${API_BASE}/auth/github`);
  }, []);
  const logout = useCallback(() => setToken(null), [setToken]);

  useEffect(() => {
    // Called by the axios interceptor when it sees 401/403
    const offUnauthorized = onUnauthorized(() => setToken(null));

    // Cross-tab sync (localStorage changes from other tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') setTokenState(getAuthToken());
    };
    window.addEventListener('storage', onStorage);

    // Same-tab programmatic updates
    const sync = () => setTokenState(getAuthToken());
    window.addEventListener(AUTH_CHANGED, sync);

    return () => {
      offUnauthorized();
      window.removeEventListener('storage', onStorage);
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

/**
 * Use on the OAuth callback route.
 * Grabs token from URL (supports several common param names) and hard-redirects.
 * Using location.replace avoids timing issues where the router renders before state updates.
 */
export function useAuthCallback() {
  useEffect(() => {
    const url = new URL(window.location.href);

    const fromSearch =
      url.searchParams.get('token') ||
      url.searchParams.get('jwt') ||
      url.searchParams.get('access_token') ||
      url.searchParams.get('t');

    // also support `#token=...` in the hash
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

      // Hard replace to avoid the "login then bounce home" race
      // and to keep the callback page out of history.
      // Use a microtask to ensure storage writes are flushed.
      setTimeout(() => window.location.replace('/dashboard'), 0);
    } else {
      // No token came back — go home
      window.location.replace('/');
    }
  }, []);
}
