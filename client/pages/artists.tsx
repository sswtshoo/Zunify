import { useState, useEffect } from 'react';
import { useApiClient } from '../utils/ApiClient';
import { useAuth } from '../utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import Link from 'next/link';

interface ArtistItemProps {
  followers: {
    total: number;
  };
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  name: string;
}

const Artists = () => {
  const [artists, setArtists] = useState<ArtistItemProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();
  const { checkAndRefreshToken, handleApiError } = useAuth();

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) return;

        const response = await apiClient.get(
          '/me/following?type=artist&limit=50'
        );
        setArtists(response.data.artists.items);
        setError(null);
      } catch (err: any) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          // Retry the request if token was refreshed
          try {
            const response = await apiClient.get(
              '/me/following?type=artist&limit=50'
            );
            setArtists(response.data.artists.items);
            setError(null);
          } catch (retryErr) {
            setError('Failed to fetch artists after token refresh');
          }
        } else if (err.response?.status === 429) {
          setError('Too many requests. Please try again later.');
        } else {
          setError('Error fetching artists');
          console.error('Error fetching artists:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtists();
  }, [apiClient]);

  if (error) {
    return (
      <div className="pt-16 p-12 flex flex-col items-center justify-center">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="pt-16 p-12 flex flex-col mb-24">
      <p className="text-4xl font-bold">Your artists</p>
      <div className="artist-container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 justify-around overflow-auto mt-10">
        {artists.map((artist) => (
          <Link
            href={`/artists/${artist.id}`}
            key={artist.id}
            className="cursor-pointer"
          >
            <div className="group mt-8 hover:cursor-pointer relative">
              <div className="relative">
                {artist.images[0]?.url && (
                  <img
                    src={artist.images[0].url}
                    alt={artist.name}
                    className="w-full h-auto rounded-3xl aspect-square group-hover:opacity-70 transition duration-300"
                  />
                )}
                <div className="absolute inset-0 flex justify-end items-end p-4">
                  <div className="bg-[rgb(32,75,246)] p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <FaPlay className="text-white" />
                  </div>
                </div>
              </div>
              <p className="font-semibold text-base text-neutral-400 w-48 mt-2 leading-tight line-clamp-2 group-hover:text-neutral-100 transition duration-300">
                {artist.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Artists;
