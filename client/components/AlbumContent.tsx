import React, { useState, useEffect } from 'react';
import { useApiClient } from '@/utils/ApiClient';
import { useAuth } from '@/utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import { PiShuffleBold } from 'react-icons/pi';
import { useRouter } from 'next/router';

interface Track {
  id: string;
  name: string;
  uri: string;
  artists: {
    name: string;
    id: string;
  }[];
  duration_ms: number;
}

interface AlbumDetails {
  id: string;
  name: string;
  artists: {
    name: string;
    id: string;
  }[];
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  total_tracks: number;
}

const msToMinutes = (ms: number) => {
  var minutes = Math.floor(ms / 60000);
  var seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
};

const AlbumContent = () => {
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [albumDetails, setAlbumDetails] = useState<AlbumDetails>();
  const [isPlaying, setIsPlaying] = useState(false);
  const apiClient = useApiClient();
  const router = useRouter();

  const { checkAndRefreshToken, handleApiError } = useAuth();

  const { id: albumId } = router.query;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlbumTracks = async () => {
      if (!albumId) {
        setError('Invalid album');
        setIsLoading(false);
        return;
      }

      try {
        const isTokenValid = checkAndRefreshToken();

        if (!isTokenValid) return;
        const [trackResponse, detailResponse] = await Promise.all([
          apiClient.get(`/albums/${albumId}/tracks/?limit=50`),
          apiClient.get(`/albums/${albumId}`),
        ]);
        setAlbumTracks(trackResponse.data.items);
        setAlbumDetails(detailResponse.data);
      } catch (err: any) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            const [trackResponse, detailResponse] = await Promise.all([
              apiClient.get(`/albums/${albumId}/tracks/?limit=50`),
              apiClient.get(`/albums/${albumId}`),
            ]);

            setAlbumTracks(trackResponse.data.items);
            setAlbumDetails(detailResponse.data);

            setError(null);
          } catch (retryErr) {
            setError('Failed to fetch playlist data after token refresh');
          }
        } else if (err.response?.status === 429) {
          setError('Too many requests. Please try again later.');
        } else {
          setError('Error fetching playlist data');
          console.error('Error fetching playlist data:', err);
        }
      }
    };
    if (albumId) {
      fetchAlbumTracks();
    }
  }, [albumId]);

  const handlePlayClick = async () => {
    if (!albumDetails) return;

    try {
      await apiClient.put('me/player/play', {
        context_uri: `spotify:album:${albumId}`,
        position_ms: 0,
      });
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing album:', error);
    }
  };

  const handleShuffleClick = async () => {
    if (!albumDetails) return;

    try {
      await apiClient.put('me/player/shuffle?state=true');

      await apiClient.put('me/player/play', {
        context_uri: `spotify:album:${albumId}`,
      });
      setIsPlaying(true);

      localStorage.setItem('currentQueue', JSON.stringify(albumTracks));
      localStorage.setItem('currentTrack', JSON.stringify(albumTracks[0]));
      localStorage.setItem('currentPlaylistId', albumId as string);
      localStorage.setItem('currentIndex', '0');
    } catch (error) {
      console.error('Error shuffling album:', error);
    }
  };

  const handleTrackClick = async (trackUri: string, index: number) => {
    try {
      localStorage.setItem('currentQueue', JSON.stringify(albumTracks));
      localStorage.setItem('currentTrack', JSON.stringify(albumTracks[0]));
      localStorage.setItem('currentPlaylistId', albumId as string);
      localStorage.setItem('currentIndex', '0');
      await apiClient.put('me/player/play', {
        context_uri: `spotify:album:${albumId}`,
        offset: { position: index },
      });
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (!albumDetails) {
    return <div className="p-8">No album found</div>;
  }

  return (
    <div className="flex flex-col mb-28">
      <div className="relative">
        <div
          className="absolute inset-0 h-[400px]"
          style={{
            backgroundImage: `url(${albumDetails.images[0]?.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(100px)',
            opacity: '0.6',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          }}
        />

        {/* Gradient */}
        <div className="absolute inset-0 h-[400px] bg-gradient-to-b from-transparent via-black/50 to-stone-950" />

        <div className="relative p-8">
          <div className="flex flex-row justify-between flex-wrap pt-8 ml-2">
            <div className="flex items-end space-x-6 mb-8">
              <img
                src={albumDetails.images[0]?.url}
                alt={albumDetails.name}
                className="w-60 h-60 rounded-lg"
              />
              <div className="flex flex-col space-y-2">
                <p className="text-sm uppercase font-bold text-neutral-200">
                  Album
                </p>
                <h1 className="text-4xl font-bold text-neutral-200">
                  {albumDetails.name}
                </h1>
                <div className="flex items-center text-sm">
                  <p className="text-neutral-200">
                    {albumDetails.artists
                      .map((artist) => artist.name)
                      .join(', ')}
                  </p>
                  <span className="mx-1 text-neutral-400">•</span>
                  <p className="text-neutral-200">
                    {albumDetails.total_tracks} songs
                  </p>
                </div>
              </div>
            </div>

            <div className="play-shuffle gap-x-4 flex flex-row items-end mb-12 mx-4">
              <button
                onClick={handlePlayClick}
                className="w-24 h-10 rounded-lg flex flex-row justify-center items-center bg-indigo-600 gap-x-2 hover:bg-indigo-500 transition"
              >
                <FaPlay size={12} />
                <p className="text-white font-medium text-base">Play</p>
              </button>
              <button
                onClick={handleShuffleClick}
                className="w-24 h-10 rounded-lg flex flex-row justify-center items-center bg-indigo-600 gap-x-2 hover:bg-indigo-500 transition"
              >
                <PiShuffleBold size={16} />
                <p className="text-white font-medium text-base">Shuffle</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="playlist-content min-w-0 w-full">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-4">
          <div className="subheading-container col-span-2 grid grid-cols-subgrid text-neutral-400 text-sm border-b border-neutral-600 pb-2 mx-4 mt-8 mb-4">
            <div className=""># Title</div>
            <div className="text-center w-20 place-self-end">Time</div>
          </div>

          {albumTracks.map((track, index) => (
            <div
              key={track.id}
              className="track-container col-span-2 grid grid-cols-subgrid items-center justify-between hover:bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg transition duration-300 px-4 py-4 cursor-pointer"
              onClick={() => handleTrackClick(track.uri, index)}
            >
              <div className="title flex flex-row items-center min-w-0">
                <span className="text-xs text-neutral-400 w-6">
                  {index + 1}
                </span>
                <p className="text-sm text-neutral-300 truncate">
                  {track.name}
                </p>
              </div>

              <div className="duration text-sm text-center place-self-end text-neutral-300 w-20">
                {msToMinutes(track.duration_ms)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlbumContent;
