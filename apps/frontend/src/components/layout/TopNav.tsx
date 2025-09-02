import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function TopNav() {
  const { isAuthed, logout } = useAuth();
  const location = useLocation();

  // If you're on /admin (or subpaths), the single tab should read "Admin"
  const onAdmin = location.pathname.startsWith("/admin");

  const base =
    "px-3 py-2 rounded-xl text-sm font-medium transition-colors";
  const active =
    "bg-slate-200/60 text-slate-900 dark:bg-slate-800/60 dark:text-white";
  const idle =
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/60 backdrop-blur bg-white/70 dark:bg-slate-950/50">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">InventoryApp</span>

          {/* Primary nav (no permanent Admin item) */}
          <nav className="ml-2 hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${base} ${isActive ? active : idle}`}
            >
              Home
            </NavLink>

            {isAuthed && (
              <NavLink
                to={onAdmin ? "/admin" : "/dashboard"}
                className={({ isActive }) =>
                  `${base} ${
                    // treat /admin as active even though "to" toggles
                    (onAdmin && location.pathname.startsWith("/admin")) || isActive
                      ? active
                      : idle
                  }`
                }
              >
                {onAdmin ? "Admin" : "Dashboard"}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthed ? (
            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            >
              Logout
            </button>
          ) : (
            <NavLink to="/login" className={`${base} ${idle}`}>
              Login
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
