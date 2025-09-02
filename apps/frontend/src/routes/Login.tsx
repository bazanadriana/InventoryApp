import { useMemo } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (window.location.hostname.includes("netlify")
    ? "https://inventoryapp-14ez.onrender.com/api"
    : "http://localhost:4000/api");

export default function Login() {
  const err = useMemo(() => new URL(window.location.href).searchParams.get("err"), []);

  return (
    <div style={{ maxWidth: 420, margin: "5rem auto", padding: 24 }}>
      <h1>Sign in</h1>
      {err && (
        <p style={{ color: "tomato" }}>
          Login error: <strong>{err}</strong>
        </p>
      )}
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <a href={`${API_BASE}/auth/google`} className="btn">Continue with Google</a>
        <a href={`${API_BASE}/auth/github`} className="btn">Continue with GitHub</a>
      </div>
    </div>
  );
}
