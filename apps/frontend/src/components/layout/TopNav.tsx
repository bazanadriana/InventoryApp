import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function TopNav() {
  const { isAuthed } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-semibold tracking-tight text-slate-900 dark:text-white">
          InventoryApp
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Home</Link>
          {isAuthed && (
            <>
              <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Dashboard</Link>
              <Link to="/admin" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Admin</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
