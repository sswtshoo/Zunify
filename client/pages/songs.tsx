import { useState, useEffect, useContext } from 'react';
import { useApiClient } from '../utils/ApiClient';
import { useAuth } from '../utils/useAuth';

import { useRouter } from 'next/router';
import { TokenContext } from '@/context/TokenProvider';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Play, Shuffle } from '@phosphor-icons/react';

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
    }[];
    duration_ms: number;
  };
}

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
};

const Songs = () => {
  const [songs, setSongs] = useState<TrackItems[]>([]);
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
    const fetchSongs = async () => {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) return;

        const response = await apiClient.get('/me/tracks?limit=50');
        const response2 = await apiClient.get('/me/tracks?limit=50&offset=50');
        const response3 = await apiClient.get('/me/tracks?limit=50&offset=100');
        const response4 = await apiClient.get('/me/tracks?limit=50&offset=150');
        const response5 = await apiClient.get('/me/tracks?limit=50&offset=200');

        const finalResponse = response.data.items.concat(
          response2.data.items,
          response3.data.items,
          response4.data.items,
          response5.data.items
        );
        // console.log('Final Response: ', finalResponse);
        setSongs(finalResponse);
        setError(null);
      } catch (err) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            const response = await apiClient.get('/me/tracks?limit=50');
            setSongs(response.data.items);
            setError(null);
          } catch (retryErr) {
            setError(`Failed to fetch songs after token refresh: ${retryErr}`);
          }
        } else {
          setError('Error fetching songs');
          console.error('Error fetching songs:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
  }, []);

  const handleTrackClick = async (track: TrackItems, index: number) => {
    try {
      const isTokenValid = await checkAndRefreshToken();
      if (!isTokenValid) {
        window.location.href = 'http://localhost:5174';
        return;
      }

      localStorage.setItem('currentQueue', JSON.stringify(songs));
      localStorage.setItem('currentTrack', JSON.stringify(track));
      localStorage.setItem('currentIndex', index.toString());

      localStorage.setItem('currentPlaylistId', 'liked');

      await apiClient.put('/me/player/play', {
        uris: songs.map((song) => song.track.uri),
        offset: { position: index },
      });
    } catch (err) {
      const refreshSuccessful = await handleApiError(err);
      if (refreshSuccessful) {
        try {
          await apiClient.put('/me/player/play', {
            uris: songs.map((song) => song.track.uri),
            offset: { position: index },
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
  };

  const handlePlayClick = async () => {
    if (songs.length > 0) {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) {
          window.location.href = 'http://localhost:5174';
          return;
        }

        localStorage.setItem('currentQueue', JSON.stringify(songs));
        localStorage.setItem('currentTrack', JSON.stringify(songs[0]));
        localStorage.setItem('currentIndex', '0');
        localStorage.setItem('currentPlaylistId', 'liked');

        await apiClient.put('/me/player/play', {
          uris: songs.map((song) => song.track.uri),
        });
      } catch (err) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            await apiClient.put('/me/player/play', {
              uris: songs.map((song) => song.track.uri),
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
    if (songs.length > 0) {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) {
          window.location.href = 'http://localhost:5174';
          return;
        }

        // Enable shuffle mode first
        await apiClient.put('/me/player/shuffle', null, {
          params: { state: true },
        });

        localStorage.setItem('currentQueue', JSON.stringify(songs));
        localStorage.setItem('currentTrack', JSON.stringify(songs[0]));
        localStorage.setItem('currentIndex', '0');
        localStorage.setItem('currentPlaylistId', 'liked');

        await apiClient.put('/me/player/play', {
          uris: songs.map((song) => song.track.uri),
        });
      } catch (err) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            await apiClient.put('/me/player/shuffle', null, {
              params: { state: true },
            });
            await apiClient.put('/me/player/play', {
              uris: songs.map((song) => song.track.uri),
            });
          } catch (retryErr) {
            console.error(
              'Error starting shuffled playback after token refresh:',
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
    <motion.div className="pt-20 p-12 flex flex-col mb-24 max-w-full overflow-y-scroll">
      <div className="flex flex-row justify-between flex-wrap">
        <div className="playlist-meta flex flex-row gap-x-8 mb-8 mx-4">
          <img
            src="https://misc.scdn.co/liked-songs/liked-songs-300.png"
            height={200}
            width={200}
            className="aspect-square rounded-lg self-baseline"
            alt="Playlist cover"
          />
          <div className="flex flex-col justify-end items-start space-y-2">
            <div className="flex flex-col space-y-1 mb-4">
              <p className="text-4xl font-black">Liked Songs</p>
              {songs.length > 0 && (
                <p className="font-normal text-sm text-neutral-200">
                  {songs.length} songs
                </p>
              )}
            </div>

            <div className="play-shuffle gap-x-4 flex flex-row items-end">
              <motion.button
                className="w-28 rounded-md flex flex-row px-4 py-2 justify-center items-center gap-x-2 border-[1px] border-opacity-0 bg-darkorange border-lemon hover:border-opacity-100 transition-colors hover:font-extrabold"
                onClick={handlePlayClick}
                whileTap={{ scale: 0.95 }}
              >
                <Play size={14} className="text-lemon" weight="fill" />
                <p className="text-lemon font-semibold text-sm">Play</p>
              </motion.button>
              <motion.button
                className="w-28 rounded-md flex flex-row px-4 py-2 justify-center border-[1px] border-opacity-0 items-center gap-x-2 bg-darkorange border-lemon hover:border-opacity-100 transition-colors"
                onClick={handleShuffleClick}
                whileTap={{ scale: 0.95 }}
              >
                <Shuffle size={15} className="text-lemon" weight="bold" />
                <p className="text-lemon font-semibold text-sm">Shuffle</p>
              </motion.button>
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
            <div className="text-end w-20">Time</div>
          </div>

          {songs.map((song, index) => (
            <motion.div
              key={song.track.id}
              className="track-container col-span-4 grid grid-cols-subgrid items-center hover:bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg transition duration-100 px-4 py-4 cursor-pointer focus:outline-none"
              onHoverStart={(event) => {}}
              onHoverEnd={(event) => {}}
              onClick={() => handleTrackClick(song, index)}
              whileTap={{ scale: 0.98, transition: { duration: 0.3 } }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div
                className="title flex flex-row items-center justify-start gap-x-2 min-w-0"
                onClick={() => handleTrackClick(song, index)}
              >
                <div className="image-icon relative group flex-shrink-0">
                  <img
                    src={
                      song.track.album.images[0]?.url ||
                      '/api/placeholder/40/40'
                    }
                    alt={song.track.name}
                    height={40}
                    width={40}
                    className="aspect-square rounded-[0.25rem] group-hover:opacity-70 transition-opacity duration-300"
                  />
                  <Play
                    className="absolute inset-0 m-auto z-10 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    size={16}
                    weight="fill"
                  />
                </div>
                <p className="text-sm font-medium text-neutral-300 truncate">
                  {song.track.name}
                </p>
              </div>
              <div className="artists min-w-0">
                <p className="text-sm font-medium text-neutral-300 truncate">
                  {song.track.artists.map((artist) => artist.name).join(', ')}
                </p>
              </div>
              <Link
                className="album text-sm font-medium text-neutral-300 truncate min-w-0 hover:underline"
                href={`/albums/${song.track.album.id}`}
              >
                {song.track.album.name}
              </Link>
              <div className="time-font duration text-sm font-medium text-neutral-300 text-right">
                {formatTime(song.track.duration_ms)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Songs;
