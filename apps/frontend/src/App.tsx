import { Routes, Route, Navigate } from "react-router-dom";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import NotFound from "./routes/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
import StudioDashboard from "./pages/StudioDashboard";
import { useAuth } from "./hooks/useAuth";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { authReady, isAuthed } = useAuth();
  if (!authReady) return <div className="p-6 text-center">Loading…</div>;
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Home />} /> {/* or your Login component */}
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/oauth/callback" element={<Navigate to="/auth/callback" replace />} />
          <Route path="/logout" element={<Logout />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <StudioDashboard />
              </RequireAuth>
            }
          />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}