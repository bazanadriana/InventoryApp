import { Routes, Route, Navigate } from "react-router-dom";
import TopNav from "./components/layout/TopNav";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Inventory from "./routes/Inventory";
import NotFound from "./routes/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
import StudioDashboard from "./pages/StudioDashboard";
import { useAuth } from "./hooks/useAuth";

/** Simple auth/role gate */
function RequireAuth({
  children,
  requiredRole,
}: {
  children: JSX.Element;
  requiredRole?: "admin" | "user";
}) {
  const { isAuthed } = useAuth();

  if (!isAuthed) return <Navigate to="/" replace />;

  // Optional role check (only if you store role in localStorage)
  if (requiredRole === "admin") {
    const role = localStorage.getItem("role");
    if (role !== "admin") return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <TopNav />
      {/* Make default text white in dark mode */}
      <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 dark:text-white">
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Regular user dashboard */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Inventory />
              </RequireAuth>
            }
          />

          {/* Admin studio */}
          <Route
            path="/admin"
            element={
              <RequireAuth requiredRole="admin">
                <StudioDashboard />
              </RequireAuth>
            }
          />

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
