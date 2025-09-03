import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (window.location.hostname.includes("netlify")
    ? "https://inventoryapp-14ez.onrender.com/api"
    : "http://localhost:4000/api");

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,     // 🔑 send the httpOnly cookie cross-site
});

export default http;
