// frontend/src/App.tsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Inventory from './routes/Inventory';
import Admin from './routes/Admin';
import NotFound from './routes/NotFound';
import OAuthCallback from './pages/OAuthCallback';
import { useAuth } from './hooks/useAuth';
import Logout from './pages/Logout';

// ✅ Use the Studio **Dashboard** page (not the old Studio.tsx)
import StudioDashboard from './pages/StudioDashboard';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { pathname } = useLocation();
  const isStudio = pathname.startsWith('/dashboard'); // full-screen Studio view

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      {/* Hide outer nav on Studio so it doesn't duplicate Studio's own header */}
      {!isStudio && <TopNav />}

      {/* Use constrained container for normal pages; Studio handles its own layout */}
      <main className={isStudio ? '' : 'mx-auto max-w-6xl px-4 py-8'}>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* OAuth callbacks */}
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Instant logout route: clears auth and redirects */}
          <Route path="/logout" element={<Logout />} />

          {/* /dashboard -> Prisma Studio–style page (allow nested paths) */}
          <Route
            path="/dashboard/*"
            element={
              <RequireAuth>
                <StudioDashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/inventory/:id"
            element={
              <RequireAuth>
                <Inventory />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Admin />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Hide footer on Studio for a clean full-screen workspace */}
      {!isStudio && <Footer />}
    </div>
  );
}
