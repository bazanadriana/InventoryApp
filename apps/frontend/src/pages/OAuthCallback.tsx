import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function getParamFromHash(name: string): string | null {
  if (!window.location.hash) return null;
  const hp = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hp.get(name);
}

/** Ensure we store only the raw JWT (no "Bearer " prefix) */
function stripBearer(t: string) {
  return t.startsWith("Bearer ") ? t.slice("Bearer ".length) : t;
}

/** Very simple open-redirect guard */
function sanitizeNext(next: string | null | undefined) {
  const val = next || "/dashboard";
  return val.startsWith("/") && !val.startsWith("//") ? val : "/dashboard";
}

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { saveToken } = useAuth();
  const ran = useRef(false); // avoid double-run in StrictMode

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

    const hashToken =
      getParamFromHash("token") ||
      getParamFromHash("jwt") ||
      getParamFromHash("id_token") ||
      getParamFromHash("access_token") ||
      getParamFromHash("t");

    const rawToken = searchToken || hashToken;

    // If backend sign-in failed, it may send ?err=...
    const err = params.get("err");
    if (err && !rawToken) {
      navigate(`/login?err=${encodeURIComponent(err)}`, { replace: true });
      return;
    }

    if (rawToken) {
      // Store only the JWT string (without 'Bearer ')
      const jwt = stripBearer(rawToken);
      saveToken(jwt); // useAuth should put it in localStorage

      // Optional: support role/uid via params if you pass them (non-breaking)
      const role = params.get("role") || getParamFromHash("role");
      if (role) localStorage.setItem("role", role);

      // Redirect target
      const safeNext = sanitizeNext(params.get("next") || getParamFromHash("next"));

      // Clean URL (remove token from address bar) & navigate
      window.history.replaceState({}, "", safeNext);
      navigate(safeNext, { replace: true });

      // Belt & suspenders: ensure navigation even if router guards race
      setTimeout(() => {
        if (window.location.pathname + window.location.search !== safeNext) {
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
