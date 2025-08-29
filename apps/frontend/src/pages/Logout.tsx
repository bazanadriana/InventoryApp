import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * When visited, this page immediately logs the user out and redirects home.
 */
export default function Logout() {
  const { logout } = useAuth();          // <- should clear token/local state
  const navigate = useNavigate();

  useEffect(() => {
    // If you also clear an httpOnly cookie on the server, you can call it here:
    // (safe to ignore failure; we still clear client auth)
    // fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
    //   method: "POST",
    //   credentials: "include",
    // }).catch(() => { /* no-op */ });

    logout();                             // clear token / auth state
    navigate("/", { replace: true });     // send them home
  }, [logout, navigate]);

  return null; // Nothing to render; it’s instant
}
