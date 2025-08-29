
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isPresentationPage = location.pathname.startsWith('/presentation');

  return (
    <nav className="w-full bg-neutral-950 text-gray-100 px-6 py-3 flex items-center justify-between shadow-md border-b border-white/10">
      {/* App name as a link */}
      <Link
        to="/"
        className="text-xl font-semibold tracking-tight hover:text-gray-300 transition-colors"
      >
        Inventory App
      </Link>

      {/* Conditional links */}
      {isPresentationPage ? (
        <Link
          to="/"
          className="text-sm bg-white text-gray-900 px-4 py-2 rounded hover:bg-gray-200 transition"
        >
          Home
        </Link>
      ) : (
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm hover:underline">
            Home
          </Link>
          <Link to="/dashboard" className="text-sm hover:underline">
            Dashboard
          </Link>
        </div>
      )}
    </nav>
  );
}

