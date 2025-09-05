import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function getParamFromHash(name: string): string | null {
  if (!window.location.hash) return null;
  const hp = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hp.get(name);
}

/** Ensure we store only the raw JWT (no "Bearer " prefix) */
function stripBearer(t: string) {
  return t?.startsWith("Bearer ") ? t.slice("Bearer ".length) : t;
}

/** Very simple open-redirect guard */
function sanitizeNext(next: string | null | undefined) {
  const val = next || "/dashboard";
  return val.startsWith("/") && !val.startsWith("//") ? val : "/dashboard";
}

export default function OAuthCallback() {
  const [params] = useSearchParams();
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
      setTimeout(() => window.location.replace(`/login?err=${encodeURIComponent(err)}`), 0);
      return;
    }

    if (rawToken) {
      // Store only the JWT string (without 'Bearer ')
      const jwt = stripBearer(rawToken);
      saveToken(jwt); // useAuth saves to localStorage & broadcasts

      // Optional: support role via params if you pass it
      const role = params.get("role") || getParamFromHash("role");
      if (role) localStorage.setItem("role", role);

      // Compute safe redirect target
      const safeNext = sanitizeNext(params.get("next") || getParamFromHash("next"));

      // Hard replace keeps callback page out of history and avoids guard races.
      // Timeout lets storage/event flush on Safari/iOS before navigation.
      setTimeout(() => window.location.replace(safeNext), 0);
    } else {
      // No token and no explicit error → bounce to login
      setTimeout(() => window.location.replace("/login?err=missing_token"), 0);
    }
  }, [params, saveToken]);

  return (
    <div className="min-h-[60vh] grid place-items-center text-slate-500">
      Completing sign-in…
    </div>
  );
}