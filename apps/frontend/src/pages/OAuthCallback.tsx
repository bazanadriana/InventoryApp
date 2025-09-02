// apps/frontend/src/pages/OAuthCallback.tsx
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { saveToken } = useAuth();
  const ran = useRef(false); // avoid double-run in React StrictMode (dev)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Provider may return different keys; support a few common ones
    const token =
      params.get("token") ||
      params.get("id_token") ||
      params.get("access_token");

    // If backend sign-in failed, we send ?err=...
    const err = params.get("err");
    if (err && !token) {
      navigate(`/login?err=${encodeURIComponent(err)}`, { replace: true });
      return;
    }

    if (token) {
      // Persist token (localStorage/cookie depending on your hook)
      saveToken(token);

      // Optional post-login target (?next=/some/path), guard against open redirects
      const rawNext = params.get("next") || "/dashboard";
      const safeNext =
        rawNext.startsWith("/") && !rawNext.startsWith("//")
          ? rawNext
          : "/dashboard";

      // Clean URL + navigate, with a hard redirect fallback
      window.history.replaceState({}, "", safeNext);
      navigate(safeNext, { replace: true });

      setTimeout(() => {
        if (window.location.pathname !== safeNext) {
          window.location.assign(safeNext);
        }
      }, 0);
    } else {
      // No token and no explicit error → bounce to login
      navigate("/login?err=missing_token", { replace: true });
    }
  }, [params, navigate, saveToken]);

  return (
    <div className="p-6 text-center text-gray-600">
      Completing sign-in…
    </div>
  );
}
