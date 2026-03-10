import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

function readGoogleTokensFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    return { access_token: accessToken, refresh_token: refreshToken };
  }
  return null;
}

function readGoogleNewUserFlagFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('is_new_user') === '1';
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isJwtExpired(token, skewSeconds = 30) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= (nowSec + skewSeconds);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('barakah-user') || 'null')
  );
  const [tokens, setTokens] = useState(() => {
    const localTokens = JSON.parse(localStorage.getItem('barakah-tokens') || 'null');
    if (localTokens?.access_token) return localTokens;
    return readGoogleTokensFromUrl();
  });
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  const isShopOwner = user?.role === 'shop_owner';

  /* ── Persist to localStorage on change ── */
  useEffect(() => {
    if (tokens) localStorage.setItem('barakah-tokens', JSON.stringify(tokens));
    else localStorage.removeItem('barakah-tokens');
  }, [tokens]);

  useEffect(() => {
    if (user) localStorage.setItem('barakah-user', JSON.stringify(user));
    else localStorage.removeItem('barakah-user');
  }, [user]);

  /* ── Remove OAuth tokens from URL bar after capture ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (readGoogleNewUserFlagFromUrl()) {
      sessionStorage.setItem('barakah-needs-role-selection', '1');
    }

    if (params.get('access_token') && params.get('refresh_token')) {
      params.delete('access_token');
      params.delete('refresh_token');
      params.delete('is_new_user');
      const qs = params.toString();
      const cleanUrl = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  /* ── Hydrate user when token changes ── */
  useEffect(() => {
    const hydrate = async () => {
      if (!tokens?.access_token) {
        setLoading(false);
        return;
      }

      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;

      const loadProfile = async () => {
        const res = await authAPI.getMe();
        setUser(res.data);
      };

      const refreshAndLoadProfile = async () => {
        if (!refreshToken || isJwtExpired(refreshToken)) {
          throw new Error('Refresh token expired');
        }

        const refreshRes = await authAPI.refresh(refreshToken);
        setTokens(refreshRes.data);
        localStorage.setItem('barakah-tokens', JSON.stringify(refreshRes.data));
        const meRes = await authAPI.getMe();
        setUser(meRes.data);
      };

      try {
        if (!isJwtExpired(accessToken)) {
          try {
            await loadProfile();
          } catch {
            await refreshAndLoadProfile();
          }
        } else {
          await refreshAndLoadProfile();
        }
      } catch {
        // Access + refresh invalid
        setTokens(null);
        setUser(null);
        localStorage.removeItem('barakah-tokens');
        localStorage.removeItem('barakah-user');
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, [tokens?.access_token, tokens?.refresh_token]);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    setTokens(res.data.tokens);
    setUser(res.data.user);
    return res.data;
  }, []);

  const signup = useCallback(async (data) => {
    const res = await authAPI.signup(data);
    // Store tokens/user so user is logged-in after signup.
    // They will be redirected to /verify-email and remain there
    // because VerifyEmail now only redirects verified users.
    setTokens(res.data.tokens);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
    localStorage.removeItem('barakah-tokens');
    localStorage.removeItem('barakah-user');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        loading,
        isAuthenticated,
        isShopOwner,
        login,
        signup,
        logout,
        refreshUser,
        setUser,
        setTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
