export function getApiBase() {
    const raw = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
    const trimmed = raw.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  