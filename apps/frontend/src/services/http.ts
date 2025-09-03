import axios, {
    AxiosHeaders,
    type AxiosRequestHeaders,
  } from "axios";
  
  export const API_BASE =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") || "";
  
  const http = axios.create({
    baseURL: API_BASE,
    withCredentials: false,
  });
  
  // Attach Bearer token safely for axios@1 (AxiosHeaders) and older shapes
  http.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (!token) return config;
  
    if (!config.headers) {
      config.headers = { Authorization: `Bearer ${token}` } as AxiosRequestHeaders;
      return config;
    }
  
    // If axios created an AxiosHeaders instance, use its .set API
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as AxiosRequestHeaders)["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });
  
  // Central 401/403 handling (broadcast; your hook listens and logs out)
  http.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        window.dispatchEvent(new CustomEvent("http:unauthorized"));
      }
      return Promise.reject(err);
    }
  );
  
  export default http;
  