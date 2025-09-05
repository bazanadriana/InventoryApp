import "./setupNoCookies";            
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import './index.css';
import { AuthProvider } from './hooks/useAuth';

/** API base (Bearer tokens, no cookies) */
export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (window.location.hostname.includes('netlify')
    ? 'https://inventoryapp-14ez.onrender.com/api'
    : 'http://localhost:4000/api');

axios.defaults.baseURL = API_BASE;
axios.defaults.withCredentials = false;   // ⬅️ ensure global default is off

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);