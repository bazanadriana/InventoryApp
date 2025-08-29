import { useEffect, useState } from 'react';

type Props = { onSearch?: (q: string) => void };

export default function Header({ onSearch }: Props) {
  const [q, setQ] = useState('');

  useEffect(() => {
    const saved = localStorage.theme;
    if (saved) document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto flex items-center gap-3 p-3">
        <button
          className="px-2 py-1 rounded border"
          onClick={() => {
            const isDark = !document.documentElement.classList.contains('dark');
            document.documentElement.classList.toggle('dark', isDark);
            localStorage.theme = isDark ? 'dark' : 'light';
          }}
        >
          🌓
        </button>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch?.(q)}
          placeholder="Search inventories & items…"
          className="flex-1 px-3 py-2 rounded border bg-white dark:bg-zinc-900"
        />
        <button
          onClick={() => onSearch?.(q)}
          className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
        >
          Search
        </button>
      </div>
    </header>
  );
}
