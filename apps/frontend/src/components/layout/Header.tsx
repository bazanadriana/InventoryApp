import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Header() {
  const { isAuthed, authReady, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <Link to={isAuthed ? "/dashboard" : "/"} className="text-2xl font-semibold">
        InventoryApp
      </Link>

      {/* Avoid flashing wrong menu before auth is known */}
      {authReady && (
        <nav className="flex items-center gap-6">
          {isAuthed ? (
            <>
              <Link className="hover:text-white" to="/dashboard">Dashboard</Link>
              <Link className="hover:text-white" to="/profile">Profile</Link>
              <button onClick={handleLogout} className="hover:text-white">Logout</button>
            </>
          ) : (
            <Link className="hover:text-white" to="/login">Login</Link>
          )}
        </nav>
      )}
    </header>
  );
}
