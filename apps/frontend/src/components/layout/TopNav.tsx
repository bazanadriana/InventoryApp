import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function TopNav() {
  const { isAuthed } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between text-slate-100">
        <Link to="/" className="text-xl font-semibold">InventoryApp</Link>
        <div className="flex items-center gap-6">
          <NavLink to="/" className={({isActive}) => isActive ? "opacity-100" : "opacity-80 hover:opacity-100"}>Home</NavLink>
          {isAuthed && (
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "opacity-100" : "opacity-80 hover:opacity-100"}>Dashboard</NavLink>
          )}
          {isAuthed && (
            <NavLink to="/logout" className="opacity-80 hover:opacity-100">Logout</NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
