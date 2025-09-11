import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/layout/Header";           
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import NotFound from "./routes/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Logout from "./pages/Logout";
import StudioDashboard from "./pages/StudioDashboard";
import Profile from "./pages/Profile";
import { useAuth } from "./hooks/useAuth";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { authReady, isAuthed } = useAuth();
  if (!authReady) return <div className="p-6 text-center">Loading…</div>;
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />                                           {/* ⬅️ global top bar */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Home />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/oauth/callback" element={<Navigate to="/auth/callback" replace />} />
          <Route path="/logout" element={<Logout />} />

          {/* Protected */}
          <Route path="/dashboard" element={<RequireAuth><StudioDashboard /></RequireAuth>} />
          <Route path="/profile"   element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/me"        element={<Navigate to="/profile" replace />} />
          <Route path="/account"   element={<Navigate to="/profile" replace />} />

          {/* Alias & 404 */}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
