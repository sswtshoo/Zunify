import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Sidebar from '../components/sidebar';
import NowPlaying from '../components/nowplaying';
import { TokenProvider } from '@/context/TokenProvider';
import { useEffect, useState, useContext } from 'react';
import { TokenContext } from '@/context/TokenProvider';
import { useAuth } from '@/utils/useAuth';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const tokenContext = useContext(TokenContext);
  const auth = useAuth();

  useEffect(() => {
    const handleToken = async () => {
      if (typeof window === 'undefined' || !router.isReady) return;

      const { access_token, expires_in } = router.query;

      if (access_token && expires_in) {
        const token = Array.isArray(access_token)
          ? access_token[0]
          : access_token;
        const expiry = Array.isArray(expires_in)
          ? parseInt(expires_in[0])
          : parseInt(expires_in);
        const expiryTime = Date.now() + expiry * 1000;

        localStorage.setItem('access_token', token);
        localStorage.setItem('token_expiry', expiryTime.toString());

        if (tokenContext) {
          tokenContext.setAccessToken(token);
          tokenContext.setTokenExpiry(expiryTime);
        }

        const { access_token: _, expires_in: __, ...restQuery } = router.query;
        router.replace(
          {
            pathname: router.pathname,
            query: restQuery,
          },
          undefined,
          { shallow: true }
        );
        return;
      }

      // Case 2: Check existing token
      const storedToken = localStorage.getItem('access_token');
      const storedExpiry = localStorage.getItem('token_expiry');

      if (
        !storedToken ||
        !storedExpiry ||
        Date.now() >= parseInt(storedExpiry)
      ) {
        // Only redirect to login if we don't have a valid token
        window.location.href = 'http://localhost:5174';
      }
    };

    handleToken();
  }, [router.isReady, router.query, tokenContext]);

  // Scroll handling
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      document.body.classList.add('scrolling');
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('scrolling');
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <TokenProvider>
      <title>Zunify</title>
      <div className="h-screen w-screen flex flex-row bg-stone-950">
        <Sidebar className="flex-shrink-0 w-[275px]" />
        <div className="content-container flex flex-col flex-grow w-full h-full">
          <div className="flex-grow overflow-auto">
            <Component {...pageProps} />
          </div>
        </div>
        <NowPlaying className="h-24 mx-auto bottom-0 w-screen" />
      </div>
    </TokenProvider>
  );
}
