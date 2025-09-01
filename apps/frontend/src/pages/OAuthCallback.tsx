import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { saveToken } = useAuth();

  useEffect(() => {
    const t = params.get('token');

    if (t) {
      saveToken(t);

      const target = '/dashboard';

      window.history.replaceState({}, '', target);
      navigate(target, { replace: true });

      setTimeout(() => {
        if (window.location.pathname !== target) {
          window.location.assign(target);
        }
      }, 0);
    } else {
      navigate('/', { replace: true });
    }
  }, [params, navigate, saveToken]);

  return <div className="p-6 text-center text-gray-600">Completing sign-in…</div>;
}
