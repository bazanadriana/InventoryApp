import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function TopNav() {
  const { isAuthed } = useAuth();
  const { pathname } = useLocation();

  const onHome = pathname === '/';
  const onDashboard = pathname.startsWith('/dashboard');

  const itemBase = 'text-slate-200 hover:text-white transition';
  const pillBtn = 'rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10';
  const navLink = ({ isActive }: { isActive: boolean }) =>
    `${itemBase} ${isActive ? 'text-white font-medium' : ''}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/40 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-white font-semibold">InventoryApp</Link>

        <nav className="flex items-center gap-4">
          {onHome ? (
            <span className="text-slate-300 select-none">Welcome</span>
          ) : isAuthed && onDashboard ? (
            <>
              <span className="text-white font-medium" aria-current="page">Dashboard</span>
              <Link to="/logout" className={pillBtn}>Logout</Link>
            </>
          ) : (
            <>
              {!onHome && (
                <NavLink to="/" className={navLink}>Home</NavLink>
              )}

              {isAuthed ? (
                <>
                  <NavLink to="/dashboard" className={navLink} end={false}>
                    Dashboard
                  </NavLink>
                  <Link to="/logout" className={pillBtn}>Logout</Link>
                </>
              ) : (
                <Link to="/" className={pillBtn}>Sign in</Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
