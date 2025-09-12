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



/** ---------- App shell ---------- */
export default function App() {
  return (
    <div className="min-h-screen">
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
