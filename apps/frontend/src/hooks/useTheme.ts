export function useTheme() {
    const set = (t: 'dark'|'light') => {
      localStorage.setItem('theme', t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    };
    return { set };
  }
  