import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import './index.css';
import { AuthProvider } from './hooks/useAuth';

/** ---------- API base & credentials (Bearer tokens, no cookies) ---------- */
export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (window.location.hostname.includes('netlify')
    ? 'https://inventoryapp-14ez.onrender.com/api'
    : 'http://localhost:4000/api');

axios.defaults.baseURL = API_BASE;
// ❗ We are NOT using cookies for auth; rely on Authorization: Bearer <jwt>
axios.defaults.withCredentials = false;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Wrap once at the root so auth state is available everywhere */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
