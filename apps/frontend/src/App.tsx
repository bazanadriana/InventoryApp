
import { Routes, Route, Navigate } from "react-router-dom";import TopNav from "./components/layout/TopNav";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Inventory from "./routes/Inventory"; 
import NotFound from "./routes/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
import StudioDashboard from "./pages/StudioDashboard";
import { useAuth } from "./hooks/useAuth";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Single dashboard for everyone */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <StudioDashboard />
              </RequireAuth>
            }
          />

          {/* Keep old /admin as an alias */}
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
