import { useContext, useCallback } from 'react';
import { TokenContext } from '../context/TokenProvider';

interface AuthHook {
  token: string | null;
  tokenExpiry: number | null;
  refreshAccessToken: () => Promise<boolean>;
  checkAndRefreshToken: () => Promise<boolean>;
  handleApiError: (error: any) => Promise<boolean>;
}

export const useAuth = (): AuthHook => {
  const tokenContext = useContext(TokenContext);

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5174/refresh-token', {
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
      window.location.href = 'http://localhost:5174';
      return false;
    }

    const timeLeft = tokenExpiry - Date.now();
    if (timeLeft < 60000) {
      return await refreshAccessToken();
    }

    return true;
  }, [tokenContext, refreshAccessToken]);

  const handleApiError = useCallback(
    async (error: any) => {
      if (error?.response?.status === 401) {
        const refreshSuccessful = await refreshAccessToken();
        if (!refreshSuccessful) {
          window.location.href = 'http://localhost:5174';
        }
        return refreshSuccessful;
      }
      return false;
    },
    [refreshAccessToken]
  );

  return {
    token: tokenContext?.accessToken ?? null,
    tokenExpiry: tokenContext?.tokenExpiry ?? null,
    refreshAccessToken,
    checkAndRefreshToken,
    handleApiError,
  };
};
