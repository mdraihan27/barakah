import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullPageLoader } from '../components/common/LoadingSpinner';

/**
 * Handles Google OAuth callback.
 * The backend redirects here with tokens in query params.
 */
export default function GoogleCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setTokens, refreshUser } = useAuth();

  useEffect(() => {
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const tokens = { access_token: accessToken, refresh_token: refreshToken };
      setTokens(tokens);
      localStorage.setItem('barakah-tokens', JSON.stringify(tokens));
      refreshUser().then(() => {
        navigate('/dashboard', { replace: true });
      });
    } else {
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <FullPageLoader />;
}
