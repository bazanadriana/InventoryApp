import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function computeBackendBase() {
  // Prefer configured API root, else fall back to current origin + /api
  const cfg = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const apiRoot =
    cfg && cfg.length > 0
      ? cfg
      : typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "/api";
  // Normalize and strip trailing /api to get the backend base
  return apiRoot.replace(/\/+$/, "").replace(/\/api$/, "");
}

export default function Home() {
  const { isAuthed } = useAuth();
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isAuthed) return <Navigate to="/dashboard" replace />;

  const BACKEND_BASE = computeBackendBase();

  const startOAuth = (provider: "google" | "github") => {
    try {
      setError(null);
      setLoading(provider);
      // Direct, same-tab navigation (best compatibility with Safari/iOS)
      window.location.href = `${BACKEND_BASE}/api/auth/${provider}`;
    } catch (e) {
      console.error(e);
      setLoading(null);
      setError(`Couldn’t start ${provider === "google" ? "Google" : "GitHub"} sign-in. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-gray-100">
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Inventory App
        </h1>
        <p className="mt-3 text-gray-300">
          Sign in to access your dashboard and inventories.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          {/* GitHub */}
          <button
            type="button"
            onClick={() => startOAuth("github")}
            aria-busy={loading === "github"}
            className="group inline-flex items-center gap-3 rounded-md border border-white/30 px-6 py-4 text-lg font-medium tracking-tight
                       hover:border-white/60 transition text-white"
            aria-label="Sign in with GitHub"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              {loading === "github" ? (
                <SpinnerIcon className="h-5 w-5 text-white" />
              ) : (
                <GitHubIcon className="h-5 w-5 text-white" />
              )}
            </span>
            <span>GitHub</span>
          </button>

          {/* Google */}
          <button
            type="button"
            onClick={() => startOAuth("google")}
            aria-busy={loading === "google"}
            className="group inline-flex items-center gap-3 rounded-md border border-white/30 px-6 py-4 text-lg font-medium tracking-tight
                       hover:border-white/60 transition text-white"
            aria-label="Sign in with Google"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              {loading === "google" ? (
                <SpinnerIcon className="h-5 w-5 text-white" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
            </span>
            <span>Google</span>
          </button>
        </div>

        {loading && (
          <div className="mt-3 text-xs text-gray-400">
            {loading === "google" ? "Redirecting to Google…" : "Redirecting to GitHub…"}
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs text-red-400" role="alert">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Icons ---------- */
function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.32 0-6.02-2.74-6.02-6.1S8.18 6 11.5 6c1.9 0 3.18.8 3.91 1.47l2.66-2.57C16.8 3.3 14.6 2.4 11.5 2.4 6.37 2.4 2.2 6.55 2.2 11.7S6.37 21 11.5 21c6.65 0 8.06-5.63 7.56-8.6H12Z"
      />
      <path
        fill="#4285F4"
        d="M21.5 12c0-.65-.06-1.14-.16-1.64H12v3.13h5.39c-.11.82-.73 2.07-2.1 2.91l3.22 2.5C20.2 17.7 21.5 15.1 21.5 12Z"
      />
      <path
        fill="#FBBC05"
        d="M6.95 14.44a6.05 6.05 0 0 1 0-4.9L3.72 7.04a10.2 10.2 0 0 0 0 9.9l3.23-2.5Z"
      />
      <path
        fill="#34A853"
        d="M11.5 21c2.9 0 5.33-.96 7.1-2.62l-3.22-2.5c-.86.55-2 1.06-3.88 1.06-2.98 0-5.5-2.03-6.4-4.77l-3.24 2.5C3.63 18.6 7.25 21 11.5 21Z"
      />
    </svg>
  );
}

function GitHubIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-current`}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.02c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.18.08 1.8 1.21 1.8 1.21 1.04 1.79 2.72 1.27 3.39.97.11-.77.41-1.27.75-1.56-2.55-.29-5.23-1.28-5.23-5.72 0-1.27.45-2.31 1.19-3.13-.12-.3-.52-1.51.11-3.14 0 0 .98-.31 3.21 1.19a11.1 11.1 0 0 1 5.84 0c2.23-1.5 3.2-1.19 3.2-1.19.64 1.63.24 2.84.12 3.14.74.82 1.18 1.86 1.18 3.13 0 4.45-2.69 5.43-5.25 5.72.42.37.81 1.1.81 2.22v3.29c0 .31.2.68.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function SpinnerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} animate-spin`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}