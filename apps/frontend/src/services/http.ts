import axios, { AxiosHeaders, type AxiosRequestHeaders } from "axios";
import { API_BASE, getAuthToken } from "./api";

const http = axios.create({
  baseURL: (API_BASE || "").replace(/\/+$/, ""),
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const token = getAuthToken(); // ← single source of truth
  if (!token) return config;

  if (!config.headers) {
    config.headers = { Authorization: `Bearer ${token}` } as AxiosRequestHeaders;
    return config;
  }
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${token}`);
  } else {
    (config.headers as AxiosRequestHeaders).Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // your useAuth hook listens to this (onUnauthorized)
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      window.dispatchEvent(new CustomEvent("http:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export default http;
