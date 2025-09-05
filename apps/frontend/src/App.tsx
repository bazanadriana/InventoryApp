import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./routes/Login";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import NotFound from "./routes/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
// import Dashboard from "./pages/Dashboard"; // ❌ not used; StudioDashboard is the authed page
import StudioDashboard from "./pages/StudioDashboard";
import { useAuth } from "./hooks/useAuth";

/** Simple auth gate that WAITS for authReady (prevents Safari bounce) */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { authReady, isAuthed } = useAuth();
  if (!authReady) return <div className="p-6 text-center">Loading…</div>;
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      {/* ⬆️ No TopNav here */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          {/* handy aliases */}
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />

          {/* OAuth callback (backend now redirects to /auth/callback?token=...) */}
          <Route path="/auth/callback" element={<OAuthCallback />} />
          {/* keep legacy alias if old links exist */}
          <Route path="/oauth/callback" element={<Navigate to="/auth/callback" replace />} />

          <Route path="/logout" element={<Logout />} />

          {/* Protected App */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <StudioDashboard />
              </RequireAuth>
            }
          />

          {/* keep /admin as alias */}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}