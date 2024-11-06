import { createContext, useEffect, useState, ReactNode } from 'react';

interface TokenContextProps {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  tokenExpiry: number | null;
  setTokenExpiry: (expiry: number | null) => void;
}

export const TokenContext = createContext<TokenContextProps | null>(null);

export const TokenProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const expiryTime = localStorage.getItem('token_expiry');
    const currentTime = Date.now();

    if (storedToken && expiryTime && currentTime < Number(expiryTime)) {
      setAccessToken(storedToken);
      setTokenExpiry(Number(expiryTime));
    } else {
      setAccessToken(null);
    }
  }, []);

  return (
    <TokenContext.Provider
      value={{ accessToken, setAccessToken, tokenExpiry, setTokenExpiry }}
    >
      {children}
    </TokenContext.Provider>
  );
};
