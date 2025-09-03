import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { saveToken } = useAuth();
  const ran = useRef(false); // avoid double-run in StrictMode (dev)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Prefer query params, but also support fragment tokens: #token=... / #access_token=...
    const searchToken =
      params.get("token") ||
      params.get("jwt") ||
      params.get("id_token") ||
      params.get("access_token") ||
      params.get("t");

    let hashToken: string | null = null;
    if (!searchToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      hashToken =
        hashParams.get("token") ||
        hashParams.get("jwt") ||
        hashParams.get("id_token") ||
        hashParams.get("access_token") ||
        hashParams.get("t");
    }

    const token = searchToken || hashToken;

    // If backend sign-in failed, it may send ?err=...
    const err = params.get("err");
    if (err && !token) {
      navigate(`/login?err=${encodeURIComponent(err)}`, { replace: true });
      return;
    }

    if (token) {
      // Persist token (localStorage via useAuth helper)
      saveToken(token);

      // Optional post-login target (?next=/some/path) with open-redirect guard
      const rawNext = params.get("next") || "/dashboard";
      const safeNext =
        rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

      // Clean URL & navigate. Use hard replace as a safety net for guard race conditions.
      window.history.replaceState({}, "", safeNext);
      navigate(safeNext, { replace: true });

      setTimeout(() => {
        if (window.location.pathname !== safeNext) {
          window.location.replace(safeNext);
        }
      }, 0);
    } else {
      // No token and no explicit error → bounce to login
      navigate("/login?err=missing_token", { replace: true });
    }
  }, [params, navigate, saveToken]);

  return (
    <div className="min-h-[60vh] grid place-items-center text-slate-300">
      Completing sign-in…
    </div>
  );
}
