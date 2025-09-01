import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

export default function TopNav() {
  const { isAuthed } = useAuth();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  const onHome = pathname === '/';
  const onDashboard = pathname.startsWith('/dashboard');
  const onAdmin = pathname.startsWith('/admin');

  const itemBase =
    'text-slate-200 hover:text-white transition';
  const pillBtn =
    'rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10';
  const toggleBtn =
    'ml-2 inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/40 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-white font-semibold">
          InventoryApp
        </Link>

        <nav className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Home page: hide Home/Logout, show neutral word */}
            {onHome ? (
              <span className="text-slate-300 select-none">Welcome</span>
            ) : isAuthed && onDashboard ? (
              /* Dashboard page: Dashboard · Admin · Logout */
              <>
                <span className="text-white font-medium">Dashboard</span>
                <Link to="/admin" className={itemBase}>
                  Admin
                </Link>
                <Link to="/logout" className={pillBtn}>
                  Logout
                </Link>
              </>
            ) : (
              /* Other pages */
              <>
                {/* Show Home link when not already on Home */}
                {!onHome && (
                  <Link to="/" className={itemBase}>
                    Home
                  </Link>
                )}

                {isAuthed && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`${itemBase} ${onDashboard ? 'text-white font-medium' : ''}`}
                      aria-current={onDashboard ? 'page' : undefined}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/admin"
                      className={`${itemBase} ${onAdmin ? 'text-white font-medium' : ''}`}
                      aria-current={onAdmin ? 'page' : undefined}
                    >
                      Admin
                    </Link>
                    <Link to="/logout" className={pillBtn}>
                      Logout
                    </Link>
                  </>
                )}

                {!isAuthed && (
                  <Link to="/" className={pillBtn}>
                    Sign in
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Theme toggle (always visible) */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className={toggleBtn}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </nav>
      </div>
    </header>
  );
}
