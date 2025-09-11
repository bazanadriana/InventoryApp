import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function TopNav() {
  const { authReady, isAuthed, logout } = useAuth();
  const navigate = useNavigate();

  if (!authReady) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    // active = permanent white; inactive = grey, white on hover
    (isActive ? "text-white" : "text-slate-400 hover:text-white");

  return (
    <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <Link to={isAuthed ? "/dashboard" : "/"} className="text-2xl font-semibold">
        InventoryApp
      </Link>

      {isAuthed && (
        <nav className="flex items-center gap-6">
          <NavLink to="/dashboard" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          <button
            onClick={() => { logout(); navigate("/", { replace: true }); }}
            className="text-slate-400 hover:text-white"
          >
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
