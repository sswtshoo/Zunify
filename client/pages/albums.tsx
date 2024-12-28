import { useState, useEffect, useContext } from 'react';
import { useApiClient } from '../utils/ApiClient';
import { useAuth } from '../utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import Link from 'next/link';
import { TokenContext } from '@/context/TokenProvider';
import { useRouter } from 'next/router';

interface AlbumItems {
  album_type: string;
  artists: {
    id: string;
    name: string;
  }[];
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  name: string;
  tracks: {
    items: {
      artists: {
        id: string;
        name: string;
      }[];
      duration_ms: number;
      name: string;
      track_number: number;
    }[];
  };
}

const Albums = () => {
  const [albums, setAlbums] = useState<AlbumItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();
  const { checkAndRefreshToken, handleApiError } = useAuth();
  const tokenContext = useContext(TokenContext);
  const router = useRouter();
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
    const fetchAlbums = async () => {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) return;

        const response = await apiClient.get('/me/albums');
        setAlbums(
          response.data.items.map((item: { album: AlbumItems }) => item.album)
        );
        setError(null);
      } catch (err) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            const response = await apiClient.get('/me/albums');
            setAlbums(
              response.data.items.map(
                (item: { album: AlbumItems }) => item.album
              )
            );
            setError(null);
          } catch (retryErr) {
            setError(
              `Failed to fetch albums after token refresh:  ${retryErr}`
            );
          }
        } else {
          setError('Error fetching albums');
          console.error('Error fetching albums:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbums();
  }, []);

  if (error) {
    return (
      <div className="w-full h-full p-12 flex flex-col items-center justify-center">
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
    <div className="pt-20 p-12 flex flex-col mb-24">
      <p className="text-4xl font-bold">Your Albums</p>
      <div className="album-container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 justify-around overflow-auto mt-10">
        {albums.map((album) => (
          <Link
            href={`/albums/${album.id}`}
            key={album.id}
            className="cursor-pointer"
          >
            <div className="group mt-8 z-10 relative">
              <div className="relative">
                {album.images[0]?.url && (
                  <img
                    src={album.images[0].url}
                    alt={album.name}
                    className="w-full h-auto rounded-3xl aspect-square group-hover:opacity-70 transition duration-300"
                  />
                )}
              </div>
              <p className="font-semibold ml-2 text-base text-neutral-400 w-48 mt-2 leading-tight line-clamp-2 group-hover:text-neutral-100 transition duration-300">
                {album.name}
              </p>
              <p className="ml-2 text-sm text-neutral-400 group-hover:text-neutral-100 transition duration-300">
                {album.artists.map((artist) => artist.name).join(', ')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Albums;
