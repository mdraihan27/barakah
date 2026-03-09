import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const refreshClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let isRefreshing = false;
let queuedRequests = [];

const AUTH_PAGES = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/'];

function readStoredTokens() {
  return JSON.parse(localStorage.getItem('barakah-tokens') || 'null');
}

function persistTokens(tokens) {
  localStorage.setItem('barakah-tokens', JSON.stringify(tokens));
}

function clearAuthStorage() {
  localStorage.removeItem('barakah-tokens');
  localStorage.removeItem('barakah-user');
}

function redirectToLoginIfNeeded() {
  const path = window.location.pathname;
  if (!AUTH_PAGES.includes(path)) {
    window.location.href = '/login';
  }
}

function processQueue(error, accessToken) {
  queuedRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(accessToken);
    }
  });
  queuedRequests = [];
}

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
  async (err) => {
    const originalRequest = err.config || {};
    const status = err.response?.status;

    if (status !== 401) {
      return Promise.reject(err);
    }

    // Never refresh on explicit auth endpoints.
    const requestUrl = originalRequest.url || '';
    if (
      requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/signup')
      || requestUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(err);
    }

    const stored = readStoredTokens();
    const refreshToken = stored?.refresh_token;
    if (!refreshToken) {
      clearAuthStorage();
      redirectToLoginIfNeeded();
      return Promise.reject(err);
    }

    if (originalRequest._retry) {
      clearAuthStorage();
      redirectToLoginIfNeeded();
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push({ resolve, reject });
      }).then((newAccessToken) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshRes = await refreshClient.post('/auth/refresh', { refresh_token: refreshToken });
      const newTokens = refreshRes.data;
      persistTokens(newTokens);

      processQueue(null, newTokens.access_token);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
      return API(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearAuthStorage();
      redirectToLoginIfNeeded();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default API;
