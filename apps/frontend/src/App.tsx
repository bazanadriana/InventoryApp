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

function RequireAuth({
  children,
  requiredRole,
}: {
  children: JSX.Element;
  requiredRole?: "admin" | "user";
}) {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/" replace />;

  // Optional lightweight role check from localStorage if you store it there.
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
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Inventory />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth requiredRole="admin">
                <StudioDashboard />
              </RequireAuth>
            }
          />

          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
