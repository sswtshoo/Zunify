import { useContext, useCallback, useEffect } from 'react';
import { TokenContext } from '../context/TokenProvider';
import { useRouter } from 'next/router';

interface AuthHook {
  token: string | null;
  tokenExpiry: number | null;
  refreshAccessToken: () => Promise<boolean>;
  checkAndRefreshToken: () => Promise<boolean>;
  handleApiError: (error: any) => Promise<boolean>;
  handleAuthCallback: () => Promise<void>;
}

export const useAuth = (): AuthHook => {
  const tokenContext = useContext(TokenContext);
  const router = useRouter();
  const server_uri = process.env.SERVER_URI;

  const handleAuthCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const returnTo = urlParams.get('returnTo') || '/';

    if (code) {
      try {
        const response = await fetch(`${server_uri}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for token');
        }

        const data = await response.json();

        if (data.access_token && tokenContext) {
          tokenContext.setAccessToken(data.access_token);
          const expiryTime = Date.now() + data.expires_in * 1000;
          tokenContext.setTokenExpiry(expiryTime);

          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('token_expiry', expiryTime.toString());

          await router.push(decodeURIComponent(returnTo));
        }
      } catch (error) {
        console.error('Error during authentication:', error);

        router.push('/login?error=authentication_failed');
      }
    }
  }, [tokenContext, router, server_uri]);

  const refreshAccessToken = useCallback(async () => {
    console.log(server_uri);
    try {
      const response = await fetch(`${server_uri as string}/refresh-token`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (data.access_token && tokenContext) {
        tokenContext.setAccessToken(data.access_token);
        const expiryTime = Date.now() + data.expires_in * 1000;
        tokenContext.setTokenExpiry(expiryTime);

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('token_expiry', expiryTime.toString());

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }, [tokenContext]);

  const checkAndRefreshToken = useCallback(async () => {
    if (!tokenContext) return false;

    const { accessToken, tokenExpiry } = tokenContext;

    if (!accessToken || !tokenExpiry) {
      const currentPath = router.asPath;

      window.location.href = `http://localhost:5174?returnTo=http://localhost:3000${encodeURIComponent(currentPath)}`;
      return false;
    }

    const timeLeft = tokenExpiry - Date.now();
    if (timeLeft < 180000) {
      return await refreshAccessToken();
    }

    return true;
  }, [tokenContext, refreshAccessToken, router]);

  const handleApiError = useCallback(
    async (error: any) => {
      if (error?.response?.status === 401) {
        return await refreshAccessToken();
      }
      return false;
    },
    [refreshAccessToken]
  );

  useEffect(() => {
    let refreshInterval: number;

    const setupRefreshInterval = () => {
      if (tokenContext?.tokenExpiry) {
        const timeUntilExpiry = tokenContext.tokenExpiry - Date.now();
        const refreshTime = Math.max(0, timeUntilExpiry - 180000);

        refreshInterval = window.setTimeout(async () => {
          await refreshAccessToken();
          setupRefreshInterval();
        }, refreshTime);
      }
    };

    setupRefreshInterval();

    return () => {
      if (refreshInterval) {
        window.clearTimeout(refreshInterval);
      }
    };
  }, [tokenContext?.tokenExpiry, refreshAccessToken]);

  return {
    token: tokenContext?.accessToken ?? null,
    tokenExpiry: tokenContext?.tokenExpiry ?? null,
    refreshAccessToken,
    checkAndRefreshToken,
    handleApiError,
    handleAuthCallback,
  };
};
