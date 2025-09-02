import { Routes, Route, Navigate } from "react-router-dom";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import NotFound from "./routes/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
import StudioDashboard from "./pages/StudioDashboard";
import { useAuth } from "./hooks/useAuth";

/** Simple auth gate */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      {/* ⬆️ No TopNav here */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Everyone lands on Studio dashboard after login */}
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

          {/* Auth helpers */}
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/logout" element={<Logout />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
