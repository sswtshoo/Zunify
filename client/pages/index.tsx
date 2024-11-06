import { useEffect, useState, useContext } from 'react';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<Playlist[]>([]);
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

    setLoading(false);
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

      setLoading(true);
      await Promise.all([fetchUserData(), fetchFeaturedPlaylists()]);
      setLoading(false);
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

      setFeaturedPlaylists(
        response.data.playlists.items.reverse().slice(0, 10)
      );
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

  return (
    <div className="pt-16 px-12 flex flex-col mb-24 overflow-y-scroll">
      <div className="flex justify-between items-center mb-12">
        <p className="text-4xl font-bold">Home</p>
        {image && (
          <img
            src={image}
            className="rounded-full object-cover"
            width={40}
            height={40}
            style={{ opacity: loading ? 0 : 100 }}
            alt="Profile"
          />
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">{message}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 justify-around">
          {featuredPlaylists.map((playlist) => (
            <Link
              href={`/playlists/${playlist.id}`}
              key={playlist.id}
              className="group mt-4 hover:cursor-pointer relative"
            >
              <div className="relative">
                {playlist.images[0]?.url && (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="w-full h-auto rounded-xl aspect-square group-hover:opacity-70 transition duration-300"
                  />
                )}
                <div className="absolute inset-0 flex justify-end items-end p-4">
                  <div className="bg-[rgb(32,75,246)] p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <FaPlay className="text-white" />
                  </div>
                </div>
              </div>
              <p className="font-semibold text-base text-neutral-400 w-48 mt-2 leading-tight truncate group-hover:text-neutral-100 transition duration-300">
                {playlist.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
