import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

/* ── Request interceptor: attach Bearer token ── */
API.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('barakah-tokens') || 'null');
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

/* ── Response interceptor: handle 401 → logout ── */
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('barakah-tokens');
      localStorage.removeItem('barakah-user');
      // Only redirect if not already on auth pages
      const path = window.location.pathname;
      if (!['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/'].includes(path)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default API;
