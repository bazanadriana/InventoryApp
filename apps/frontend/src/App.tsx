// apps/frontend/src/App.tsx
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import NotFound from "./routes/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
import StudioDashboard from "./pages/StudioDashboard";
import Profile from "./pages/Profile";
import { useAuth } from "./hooks/useAuth";

/** ---------- Auth gate ---------- */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { authReady, isAuthed } = useAuth();
  if (!authReady) {
    return (
      <div className="p-6 text-center" aria-live="polite" aria-busy="true">
        Loading…
      </div>
    );
  }
  return isAuthed ? children : <Navigate to="/login" replace />;
}

/** ---------- Global top bar (always visible) ---------- */
function TopBar() {
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

      {/* avoid flashing wrong menu before auth loads */}
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

/** ---------- App shell ---------- */
export default function App() {
  return (
    <div className="min-h-screen">
      <TopBar /> {/* ⬅️ now the header is at the very top on every page */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          {/* Use Home as login screen; replace with <Login /> if you have one */}
          <Route path="/login" element={<Home />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />

          {/* OAuth callback (support both new and legacy paths) */}
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/oauth/callback" element={<Navigate to="/auth/callback" replace />} />

          {/* Logout helper */}
          <Route path="/logout" element={<Logout />} />

          {/* Protected app */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <StudioDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          {/* aliases */}
          <Route path="/me" element={<Navigate to="/profile" replace />} />
          <Route path="/account" element={<Navigate to="/profile" replace />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
