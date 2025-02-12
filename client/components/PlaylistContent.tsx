import React, { useState, useEffect, useRef } from 'react';
import { useApiClient } from '@/utils/ApiClient';
import { useAuth } from '@/utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import { PiShuffleBold } from 'react-icons/pi';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SpotifyDescription from '@/utils/Description';

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

const msToMinutes = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
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

  const [isScrolled, setIsScrolled] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  const server_uri = process.env.SERVER_URI;

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

        const [playlistResponse, tracksResponse] = await Promise.all([
          apiClient.get(`/playlists/${playlistId}`),
          apiClient.get(`/playlists/${playlistId}/tracks?limit=100`),
        ]);

        setPlaylistMeta(playlistResponse.data);
        setTracks(tracksResponse.data.items);
        setError(null);
      } catch (err: unknown) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            const [playlistResponse, tracksResponse] = await Promise.all([
              apiClient.get(`/playlists/${playlistId}`),
              apiClient.get(`/playlists/${playlistId}/tracks?limit=100`),
            ]);

            setPlaylistMeta(playlistResponse.data);
            setTracks(tracksResponse.data.items);

            setError(null);
          } catch (retryErr) {
            setError(
              `Failed to fetch playlist data after token refresh: ${retryErr}`
            );
          }
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

  useEffect(() => {
    const scrollContainer = document.querySelector('.main-content');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (scrollContainer.scrollTop > 250) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    console.log(window.scrollY);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handlePlayClick = async () => {
    if (tracks.length > 0) {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) {
          window.location.href = `${server_uri}`;
          return;
        }

        localStorage.setItem('currentQueue', JSON.stringify(tracks));
        localStorage.setItem('currentTrack', JSON.stringify(tracks[0]));
        localStorage.setItem('currentPlaylistId', playlistId as string);
        localStorage.setItem('currentIndex', '0');

        await apiClient.put('/me/player/play', {
          context_uri: `spotify:playlist:${playlistId}`,
        });
      } catch (err: unknown) {
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
            window.location.href = `${server_uri}`;
          }
        } else {
          window.location.href = `${server_uri}`;
        }
      }
    }
  };

  const handleShuffleClick = async () => {
    const isTokenValid = await checkAndRefreshToken();
    if (!isTokenValid) {
      window.location.href = `${server_uri}`;
      return;
    }
    if (tracks.length > 0) {
      try {
        await apiClient.put('/me/player/shuffle', null, {
          params: { state: true },
        });

        await apiClient.put('/me/player/play', {
          context_uri: `spotify:playlist:${playlistId}`,
        });

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
      const isTokenValid = await checkAndRefreshToken();
      if (!isTokenValid) {
        window.location.href = `${server_uri}`;
        console.log('Invalidtoken');
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
    } catch (err: unknown) {
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

          window.location.href = `${server_uri}`;
        }
      } else {
        window.location.href = `${server_uri}`;
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

  // console.log(playlistMeta);

  return (
    <>
      <div
        className={`
          sticky top-0 z-20
          transition-all duration-300 ease-in-out
          ${
            isScrolled
              ? 'bg-stone-950/95 backdrop-blur-md h-20 shadow-lg'
              : 'bg-transparent h-0'
          }
        `}
      >
        <div
          className={`
          w-full px-8
          flex items-center h-full
          transition-all duration-300
        `}
        >
          <h1
            className={`
            text-white font-bold
            transition-all duration-300
            ${isScrolled ? 'opacity-100 text-2xl' : 'opacity-0 text-4xl'}
          `}
          >
            {playlistMeta?.name}
          </h1>
        </div>
      </div>
      <div className="flex flex-col mb-28">
        <div className="relative" ref={titleRef}>
          <div
            className="absolute inset-0 h-[400px]"
            style={{
              backgroundImage: `url(${playlistMeta?.images[0]?.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(100px)',
              opacity: '0.6',
              maskImage:
                'linear-gradient(to bottom, rgba(136, 136, 136, 1) 0%, rgba(136, 136, 136, 0) 80%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, rgba(136, 136, 136, 1) 0%, rgba(136, 136, 136, 0) 80%)',
            }}
          />

          {/* Gradient */}
          <div className="absolute inset-0 h-[400px] bg-gradient-to-b from-transparent via-black/50 to-stone-950" />

          <div className="relative p-8">
            <div className="flex flex-row justify-between flex-wrap pt-8">
              <div className="flex items-end space-x-6 mb-8">
                <img
                  src={playlistMeta?.images[0]?.url as string}
                  alt={playlistMeta?.name as string}
                  className="w-60 h-60 object-cover shadow-2xl rounded-xl z-0 shadow-neutral-950"
                />
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-col space-y-1 mb-4">
                    <p className="text-xs uppercase font-[900] text-white">
                      Playlist
                    </p>
                    <h1 className="text-4xl font-bold text-white">
                      {playlistMeta?.name}
                    </h1>
                    <p className="text-sm font-medium text-neutral-400">
                      <SpotifyDescription
                        description={`${playlistMeta?.description as string}`}
                      />
                    </p>
                  </div>

                  <div className="play-shuffle gap-x-4 flex flex-row items-end">
                    <button
                      className="w-28 rounded-md flex flex-row px-4 py-2 justify-center items-center gap-x-2 bg-gradient-to-br from-neutral-700 to-neutral-900 hover:bg-gradient-to-br hover:from-neutral-800 transition-colors"
                      onClick={handlePlayClick}
                    >
                      <FaPlay size={12} className="text-lemon" />
                      <p className="text-lemon font-medium text-sm">Play</p>
                    </button>
                    <button
                      className="w-28 rounded-md flex flex-row px-4 py-2 justify-center items-center gap-x-2 bg-gradient-to-br from-neutral-700 to-neutral-900 hover:bg-gradient-to-br hover:from-neutral-800 transition-colors"
                      onClick={handleShuffleClick}
                    >
                      <PiShuffleBold size={15} className="text-lemon" />
                      <p className="text-lemon font-medium text-sm">Shuffle</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="playlist-content min-w-0 w-full px-4">
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
                  <div className="artists min-w-0 flex flex-wrap">
                    {Array.isArray(track.artists) ? (
                      track.artists.slice(0, 6).map((artist, index) => (
                        <React.Fragment key={artist?.id || index}>
                          <Link
                            className="text-sm text-neutral-300 hover:underline max-w-fit text-ellipsis truncate line-clamp-2"
                            href={`/artists/${artist?.id || ''}`}
                          >
                            {artist?.name || 'Unknown'}
                          </Link>
                          {index < track.artists.length - 1 && (
                            <span className="text-sm text-neutral-300">
                              {`,`}&nbsp;
                            </span>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="text-sm text-neutral-300">
                        Unknown Artist
                      </span>
                    )}
                  </div>
                  <Link
                    className="album text-sm text-neutral-300 truncate min-w-0 hover:underline transition duration-300"
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
    </>
  );
};

export default PlaylistContent;
