import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallback() {
  const { saveToken } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    // token is sent by backend as http://localhost:5173#/auth/callback?token=...
    const hash = loc.hash || window.location.hash; // support hash-based
    const query = new URLSearchParams((hash.startsWith('#') ? hash.slice(1) : hash) || loc.search);
    const token = query.get('token');
    if (token) saveToken(token);
    nav('/dashboard', { replace: true });
  }, [loc, nav, saveToken]);

  return <div className="p-4">Signing you in…</div>;
}