import { useState, useEffect, useContext } from 'react';
import { useApiClient } from '../utils/ApiClient';
import { useAuth } from '../utils/useAuth';
import { motion } from 'motion/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { TokenContext } from '@/context/TokenProvider';

interface UserPlaylists {
  name: string;
  description: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  href: string;
  id: string;
}

const AllPlaylists = () => {
  const [playlists, setPlaylists] = useState<UserPlaylists[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const apiClient = useApiClient();
  const { checkAndRefreshToken, handleApiError } = useAuth();
  const tokenContext = useContext(TokenContext);
  const server_uri = process.env.SERVER_URI;

  useEffect(() => {
    const validateToken = async () => {
      if (typeof window === 'undefined' || !tokenContext) return;

      const storedToken = localStorage.getItem('access_token');
      const storedExpiry = localStorage.getItem('token_expiry');

      if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
        if (!tokenContext.accessToken) {
          tokenContext.setAccessToken(storedToken);
          tokenContext.setTokenExpiry(parseInt(storedExpiry));
        }
      } else if (!tokenContext.accessToken) {
        const returnTo = router.asPath;
        localStorage.setItem('redirect_after_login', router.asPath);
        window.location.href = `${server_uri}?returnTo=${returnTo}`;
      }
    };

    validateToken();
  }, [tokenContext]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) return;

        const response = await apiClient.get('me/playlists?limit=50');
        setPlaylists(response.data.items.filter((item: any) => item !== null));
        setIsLoading(false);
        setError(null);
      } catch (err) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            const response = await apiClient.get('me/playlists?limit=50');
            setPlaylists(response.data.items);
            setIsLoading(false);
            setError(null);
          } catch (retryErr) {
            setError(
              `Failed to fetch playlists after token refresh: ${retryErr}`
            );
          }
        } else {
          setError('Error fetching playlists');
          console.error('Error fetching playlists:', err);
        }
      }
    };

    fetchPlaylists();
  }, []);

  if (error) {
    return (
      <div className="pt-16 p-12 flex flex-col items-center justify-center">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

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
    <div className="pt-20 mb-32">
      <div className="pt-0 px-12 flex flex-col mb-12 overflow-y-scroll">
        <p className="text-4xl font-bold">Your Playlists</p>
        <motion.div className="playlist-container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 justify-around overflow-auto mt-8">
          {playlists.map((playlist) => (
            <Link
              href={`/playlists/${playlist.id}`}
              key={playlist.id}
              className="group mt-8 hover:cursor-pointer relative"
            >
              <motion.div
                className="relative"
                whileHover={{ z: 5, scale: 0.98 }}
              >
                {playlist.images[0]?.url && (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    fetchPriority="high"
                    className="w-full h-auto rounded-xl aspect-square object-cover group-hover:opacity-70 transition duration-300"
                  />
                )}
              </motion.div>
              <p className="font-semibold text-base text-neutral-400 w-48 mt-2 leading-tight truncate group-hover:text-neutral-100 transition duration-300">
                {playlist.name}
              </p>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AllPlaylists;
