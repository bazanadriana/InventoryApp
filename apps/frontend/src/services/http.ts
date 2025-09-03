import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || ""; // e.g. https://inventoryapp-14ez.onrender.com

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // using Bearer token, not cookies
});

// attach token on every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// central 401/403 handling
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      // optional: also remove role, user, etc.
      window.location.replace("/"); // back to Home/Login
    }
    return Promise.reject(err);
  }
);

export default http;
