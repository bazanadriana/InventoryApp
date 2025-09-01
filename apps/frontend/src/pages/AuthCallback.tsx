import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallback() {
  const { saveToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      saveToken(t);
      navigate('/dashboard', { replace: true }); 
    } else {
      navigate('/', { replace: true });
    }
  }, [saveToken, navigate]);

  return null;
}
