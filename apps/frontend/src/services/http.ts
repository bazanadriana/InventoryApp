import axios, { AxiosHeaders, type AxiosRequestHeaders } from "axios";
import { API_BASE, getAuthToken } from "./api";

// Normalize base (no trailing slash)
const BASE = (API_BASE || "").replace(/\/+$/, "");
const BASE_URL = new URL(BASE); // e.g. https://inventoryapp-14ez.onrender.com/api

const http = axios.create({
  baseURL: BASE,
  withCredentials: false, // ❌ no cookies; we use Authorization: Bearer
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

// Helper: is this request going to OUR API (same origin + path prefix)?
function isOurApiRequest(config: any): boolean {
  try {
    // If config.url is relative, URL() will resolve against baseURL
    const resolved = new URL(config.url ?? "", config.baseURL ?? http.defaults.baseURL);
    // Same origin AND path starts with our BASE path (/api)
    return (
      resolved.origin === BASE_URL.origin &&
      resolved.pathname.startsWith(BASE_URL.pathname)
    );
  } catch {
    return false;
  }
}

http.interceptors.request.use((config) => {
  // Only attach Authorization for our own API
  if (isOurApiRequest(config)) {
    const token = getAuthToken(); // ← single source of truth
    if (token) {
      if (!config.headers) {
        config.headers = { Authorization: `Bearer ${token}` } as AxiosRequestHeaders;
      } else if (config.headers instanceof AxiosHeaders) {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        (config.headers as AxiosRequestHeaders).Authorization = `Bearer ${token}`;
      }
    }
  }

  // Content-Type: application/json for non-FormData writes
  const method = (config.method || "get").toLowerCase();
  const isWrite = method !== "get" && method !== "head";
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isWrite && !isFormData) {
    if (config.headers instanceof AxiosHeaders) {
      if (!config.headers.has("Content-Type")) config.headers.set("Content-Type", "application/json");
    } else {
      const hdrs = (config.headers as AxiosRequestHeaders) || {};
      if (!("Content-Type" in hdrs)) hdrs["Content-Type"] = "application/json";
      config.headers = hdrs;
    }
  }

  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // Your useAuth hook listens to this via onUnauthorized()
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      window.dispatchEvent(new CustomEvent("http:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export default http;