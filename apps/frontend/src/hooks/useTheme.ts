import { useEffect, useState } from 'react';

export function useTheme() {
  const get = () =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';

  const [theme, setTheme] = useState<'dark' | 'light'>(get);

  const set = (t: 'dark' | 'light') => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    setTheme(t);
  };

  const toggle = () => set(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => { set(get()); }, []);

  return { theme, set, toggle };
}
