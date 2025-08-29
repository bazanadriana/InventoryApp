// apps/frontend/src/pages/AuthLanding.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setAuthToken } from '../services/api';

export default function AuthLanding() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const qs = new URLSearchParams(loc.search);
    const token = qs.get('token');
    if (token) {
      setAuthToken(token);
      nav('/dashboard', { replace: true });
    } else {
      nav('/', { replace: true });
    }
  }, [loc, nav]);

  return <div className="p-6 text-center">Signing you in…</div>;
}
