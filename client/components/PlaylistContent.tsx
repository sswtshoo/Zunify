import React, { useState, useEffect } from 'react';
import { useApiClient } from '@/utils/ApiClient';
import { useAuth } from '@/utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import { PiShuffleBold } from 'react-icons/pi';
import { useRouter } from 'next/router';
import ContentNavBar from './ContentNavBar';
import Link from 'next/link';

interface TrackItems {
  track: {
    album: {
      name: string;
      id: string;
      images: {
        height: number;
        url: string;
        width: number;
      }[];
    };
    name: string;
    id: string;
    uri: string;
    artists: {
      name: string;
      id: string;
    }[];
    duration_ms: number;
  };
}

interface PlaylistDetails {
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  name: string;
  description: string;
  owner: {
    display_name: string;
    id: string;
  };
}

interface SpotifyTrack {
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
  duration_ms: number;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}

const msToMinutes = (ms: number) => {
  var minutes = Math.floor(ms / 60000);
  var seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
};

const PlaylistContent = () => {
  const apiClient = useApiClient();
  const router = useRouter();
  const { checkAndRefreshToken, handleApiError } = useAuth();
  const { id: playlistId } = router.query;

  const [tracks, setTracks] = useState<TrackItems[]>([]);
  const [playlistMeta, setPlaylistMeta] = useState<PlaylistDetails>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylistData = async () => {
      if (!playlistId) {
        setError('Invalid playlist ID');
        setIsLoading(false);
        return;
      }

      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) return;

        // Fetch playlist details and tracks in parallel
        const [playlistResponse, tracksResponse] = await Promise.all([
          apiClient.get(`/playlists/${playlistId}`),
          apiClient.get(`/playlists/${playlistId}/tracks?limit=100`),
        ]);

        setPlaylistMeta(playlistResponse.data);
        setTracks(tracksResponse.data.items);
        setError(null);
      } catch (err: any) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          // Retry the requests if token was refreshed
          try {
            const [playlistResponse, tracksResponse] = await Promise.all([
              apiClient.get(`/playlists/${playlistId}`),
              apiClient.get(`/playlists/${playlistId}/tracks?limit=100`),
            ]);

            setPlaylistMeta(playlistResponse.data);
            setTracks(tracksResponse.data.items);

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
      } finally {
        setIsLoading(false);
      }
    };

    if (playlistId) {
      fetchPlaylistData();
    }
  }, [playlistId]);

  const handlePlayClick = async () => {
    if (tracks.length > 0) {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) {
          window.location.href = 'http://localhost:5174';
          return;
        }

        localStorage.setItem('currentQueue', JSON.stringify(tracks));
        localStorage.setItem('currentTrack', JSON.stringify(tracks[0]));
        localStorage.setItem('currentPlaylistId', playlistId as string);
        localStorage.setItem('currentIndex', '0');

        await apiClient.put('/me/player/play', {
          context_uri: `spotify:playlist:${playlistId}`,
        });
      } catch (err: any) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            await apiClient.put('/me/player/play', {
              context_uri: `spotify:playlist:${playlistId}`,
            });
          } catch (retryErr) {
            console.error(
              'Error starting playback after token refresh:',
              retryErr
            );
            window.location.href = 'http://localhost:5174';
          }
        } else {
          window.location.href = 'http://localhost:5174';
        }
      }
    }
  };

  const handleShuffleClick = async () => {
    const isTokenValid = await checkAndRefreshToken();
    if (!isTokenValid) {
      // If token refresh failed, redirect to auth
      window.location.href = 'http://localhost:5174';
      return;
    }
    if (tracks.length > 0) {
      try {
        // Enable shuffle mode first
        await apiClient.put('/me/player/shuffle', null, {
          params: { state: true },
        });

        // Then start playing the playlist
        await apiClient.put('/me/player/play', {
          context_uri: `spotify:playlist:${playlistId}`,
        });

        // Store playlist info
        localStorage.setItem('currentQueue', JSON.stringify(tracks));
        localStorage.setItem('currentTrack', JSON.stringify(tracks[0]));
        localStorage.setItem('currentPlaylistId', playlistId as string);
        localStorage.setItem('currentIndex', '0');
      } catch (error) {
        console.error('Error starting shuffled playback:', error);
      }
    }
  };

  const handleTrackClick = async (track: TrackItems, index: number) => {
    try {
      // Check token validity before playing
      const isTokenValid = await checkAndRefreshToken();
      if (!isTokenValid) {
        window.location.href = 'http://localhost:5174';
        return;
      }

      localStorage.setItem('currentQueue', JSON.stringify(tracks));
      localStorage.setItem('currentTrack', JSON.stringify(track));
      localStorage.setItem('currentPlaylistId', playlistId as string);
      localStorage.setItem('currentIndex', index.toString());

      await apiClient.put('/me/player/play', {
        context_uri: `spotify:playlist:${playlistId}`,
        offset: { position: index },
      });
    } catch (err: any) {
      const refreshSuccessful = await handleApiError(err);
      if (refreshSuccessful) {
        try {
          await apiClient.put('/me/player/play', {
            context_uri: `spotify:playlist:${playlistId}`,
            offset: { position: index },
          });
        } catch (retryErr) {
          console.error(
            'Error starting playback after token refresh:',
            retryErr
          );
          // If retry fails, redirect to auth
          window.location.href = 'http://localhost:5174';
        }
      } else {
        // If refresh failed, redirect to auth
        window.location.href = 'http://localhost:5174';
      }
    }
  };

  if (error) {
    return (
      <div className="pt-16 p-12 flex flex-col items-center justify-center">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <>
      {isLoading ? (
        <div className="h-full w-full flex items-center justify-center">
          <div className="h-12 w-12 rounded-full animate-spin bg-transparent border-b-4 border-indigo-700 border-dotted self-center"></div>
        </div>
      ) : (
        <div className="">
          <div className="flex flex-col mb-28">
            <div className="relative">
              <div
                className="absolute inset-0 h-[450px]"
                style={{
                  backgroundImage: `url(${playlistMeta?.images[0]?.url})`,
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
                <div className="flex flex-row justify-between flex-wrap pt-8">
                  <div className="flex items-end space-x-6 mb-8">
                    <img
                      src={playlistMeta?.images[0]?.url}
                      alt={playlistMeta?.name}
                      className="w-60 h-60 shadow-2xl rounded-lg z-0"
                    />
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm uppercase font-bold text-white">
                        Playlist
                      </p>
                      <h1 className="text-4xl font-bold text-white">
                        {playlistMeta?.name}
                      </h1>
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
                      <p className="text-white font-medium text-base">
                        Shuffle
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="playlist-content min-w-0 w-full">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-4">
                <div className="subheading-container col-span-4 grid grid-cols-subgrid text-neutral-400 text-sm border-b border-neutral-600 pb-2 mx-4 mt-8 mb-4">
                  <div className="truncate">Song</div>
                  <div className="truncate">Artist</div>
                  <div className="truncate">Album</div>
                  <div className="text-center w-20">Time</div>
                </div>

                {tracks.map((item, index) => {
                  const track = item?.track || {};
                  return (
                    <div
                      key={track.id || `track-${index}`}
                      className="track-container col-span-4 grid grid-cols-subgrid items-center hover:bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg transition duration-300 px-4 py-4 cursor-pointer"
                    >
                      <div className="title flex flex-row items-center justify-start gap-x-2 min-w-0">
                        <div
                          className="image-icon relative group flex-shrink-0"
                          onClick={() => handleTrackClick(item, index)}
                        >
                          <img
                            src={
                              track.album?.images?.[2]?.url ||
                              '/api/placeholder/40/40'
                            }
                            alt={track.name || 'Track'}
                            height={40}
                            width={40}
                            className="aspect-square rounded-[0.25rem] group-hover:opacity-70 transition-opacity duration-300"
                          />
                          <FaPlay
                            className="absolute inset-0 m-auto z-10 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            size={16}
                          />
                        </div>
                        <p className="text-sm text-neutral-300 truncate">
                          {track.name || 'Unknown Track'}
                        </p>
                      </div>
                      <div className="artists min-w-0">
                        <Link
                          className="text-sm text-neutral-300 truncate"
                          href={`/artists/${track.artists[0].id}`}
                        >
                          {Array.isArray(track.artists)
                            ? track.artists
                                .map((artist) => artist?.name || 'Unknown')
                                .join(', ')
                            : 'Unknown Artist'}
                        </Link>
                      </div>
                      <Link
                        className="album text-sm text-neutral-300 truncate min-w-0"
                        href={`/albums/${track.album.id}`}
                      >
                        {track.album?.name || 'Unknown Album'}
                      </Link>
                      <div className="duration text-sm text-neutral-300 text-center w-20">
                        {msToMinutes(track.duration_ms)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlaylistContent;
