import { useEffect, useState, useContext, useRef } from 'react';
import { useRouter } from 'next/router';
import { useApiClient } from '../utils/ApiClient';
import { TokenContext } from '../context/TokenProvider';
import { useAuth } from '../utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import Link from 'next/link';

interface Playlist {
  id: string;
  name: string;
  description: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

interface PlaylistsResponse {
  message: string;
  playlists: {
    items: Playlist[];
  };
}

const Home = () => {
  const router = useRouter();
  const tokenContext = useContext(TokenContext);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<Playlist[]>([]);
  const [recentlyPlayedAlbums, setRecentlyPlayedAlbums] = useState([]);

  const [message, setMessage] = useState<string>('');
  const apiClient = useApiClient();
  const auth = useAuth();

  useEffect(() => {
    const handleInitialToken = async () => {
      const { access_token, expires_in, redirect_path } = router.query;

      if (!tokenContext) return;

      if (access_token && expires_in) {
        const token = Array.isArray(access_token)
          ? access_token[0]
          : access_token;
        const expiry = Array.isArray(expires_in)
          ? parseInt(expires_in[0])
          : parseInt(expires_in);

        await handleTokenUpdate(token, expiry);
        handleRedirect(redirect_path);
      } else {
        await handleStoredToken();
      }
    };

    if (router.isReady) {
      handleInitialToken();
    }
  }, [router.isReady, router.query]);

  const handleTokenUpdate = async (token: string, expiry: number) => {
    if (!tokenContext) return;

    const expiryTime = Date.now() + expiry * 1000;
    tokenContext.setAccessToken(token);
    tokenContext.setTokenExpiry(expiryTime);

    localStorage.setItem('access_token', token);
    localStorage.setItem('token_expiry', expiryTime.toString());

    setIsLoading(false);
  };

  const handleStoredToken = async () => {
    if (!tokenContext || tokenContext.accessToken) return;

    const storedToken = localStorage.getItem('access_token');
    const storedExpiry = localStorage.getItem('token_expiry');

    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
      await handleTokenUpdate(
        storedToken,
        (parseInt(storedExpiry) - Date.now()) / 1000
      );
    } else {
      redirectToLogin();
    }
  };

  const handleRedirect = (redirect_path: string | string[] | undefined) => {
    const redirectTo = Array.isArray(redirect_path)
      ? redirect_path[0]
      : redirect_path;
    const targetPath = redirectTo || router.pathname;

    const {
      access_token: _,
      expires_in: __,
      redirect_path: ___,
      ...restQuery
    } = router.query;

    router.replace(
      {
        pathname: targetPath,
        query: Object.keys(restQuery).length > 0 ? restQuery : undefined,
      },
      undefined,
      { shallow: true }
    );
  };

  const redirectToLogin = () => {
    const currentPath = router.asPath.split('?')[0];
    if (currentPath !== '/') {
      localStorage.setItem('redirect_after_login', currentPath);
    }
    window.location.href = 'http://localhost:5174';
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!tokenContext?.accessToken) return;

      setIsLoading(true);
      await Promise.all([
        fetchUserData(),
        fetchFeaturedPlaylists(),
        recentlyPlayed(),
      ]);
      setIsLoading(false);
    };

    fetchData();
  }, [tokenContext?.accessToken, router.asPath]);

  const fetchFeaturedPlaylists = async () => {
    try {
      const isTokenValid = await auth.checkAndRefreshToken();
      if (!isTokenValid) return;

      const response = await apiClient.get<PlaylistsResponse>(
        'browse/categories/0JQ5DAt0tbjZptfcdMSKl3/playlists/?limit=50'
      );

      const response2 = await apiClient.get(
        'browse/categories/0JQ5DAnM3wGh0gz1MXnu89'
      );

      console.log(response2.data);

      setFeaturedPlaylists(
        response.data.playlists.items.reverse().slice(0, 10)
      );
      setMessage(response.data.message);
    } catch (error) {
      await handleFetchError(error, fetchFeaturedPlaylists);
    }
  };

  const recentlyPlayed = async () => {
    try {
      const isTokenValid = await auth.checkAndRefreshToken();
      if (!isTokenValid) return;

      const response = await apiClient.get(
        `/me/player/recently-played?limit=50`
      );

      const response2 = await apiClient.get;

      console.log(response.data.items);

      setMessage(response.data.message);
    } catch (error) {
      await handleFetchError(error, fetchFeaturedPlaylists);
    }
  };

  const fetchUserData = async () => {
    try {
      const isTokenValid = await auth.checkAndRefreshToken();
      if (!isTokenValid) return;

      const response = await apiClient.get('me');
      setImage(response.data.images[0]?.url);
    } catch (error) {
      await handleFetchError(error, fetchUserData);
    }
  };

  const handleFetchError = async (
    error: any,
    retryFunction: () => Promise<void>
  ) => {
    const refreshSuccessful = await auth.handleApiError(error);
    if (refreshSuccessful) {
      try {
        await retryFunction();
      } catch (retryError) {
        console.error('Error after token refresh:', retryError);
      }
    } else {
      console.error('Error fetching data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex space-x-2 justify-center items-center bg-white h-screen dark:invert">
        <span className="sr-only">Loading...</span>
        <div className="h-4 w-4 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-4 w-4 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-4 w-4 bg-black rounded-full animate-bounce"></div>
      </div>
    );
  }

  return (
    <div className="pt-20 px-12 flex flex-col mb-24 overflow-y-scroll">
      <div className="flex justify-between items-center mb-12">
        <p className="text-4xl font-bold">Home</p>
        {image && (
          <img
            src={image}
            className="rounded-full object-cover"
            width={40}
            height={40}
            style={{ opacity: isLoading ? 0 : 100 }}
            alt="Profile"
          />
        )}
      </div>

      <div className="mt-8 overflow-hidden max-w-full">
        <h2 className="text-2xl font-bold mb-4">{message}</h2>
        <div className="flex flex-row flex-nowrap overflow-x-auto max-w-full mr-8 no-scrollbar">
          <div className="flex-auto flex flex-row gap-x-6 w-40">
            {featuredPlaylists.map((playlist) => (
              <Link
                href={`/playlists/${playlist.id}`}
                key={playlist.id}
                className="flex flex-col cursor-default hover:opacity-65 transition-opacity duration-300 w-48 shrink-0"
              >
                {playlist.images[0]?.url && (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    height={200}
                    width={200}
                    className="aspect-square rounded-lg"
                  />
                )}

                <div className="flex flex-row items-center justify-start gap-x-2">
                  <p className="text-neutral-400 font-normal text-xs mt-2 line-clamp-2">
                    {playlist.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
