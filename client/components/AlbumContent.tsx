import React, { useState, useEffect } from 'react';
import { useApiClient } from '@/utils/ApiClient';
import { useAuth } from '@/utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import { PiShuffleBold } from 'react-icons/pi';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LibraryCheck from '@/utils/LibraryCheck';
import { IoMdHeartEmpty, IoMdHeart } from 'react-icons/io';
import { motion } from 'motion/react';

interface Track {
  id: string;
  name: string;
  uri: string;
  artists: {
    name: string;
    id: string;
  }[];
  duration_ms: number;
  isLiked?: boolean;
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

// interface Artist {
//   name: string;
//   id: string;
// }

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
};

const formatDuration = (duration: number) => {
  const hours = Math.floor(duration / (3600 * 1000));
  const minutes = Math.floor((duration % (3600 * 1000)) / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  if (hours === 1) {
    return `${hours} hour, ${minutes} minutes & ${seconds.toString().padStart(2, '0')} seconds`;
  } else if (hours > 1) {
    return `${hours} hours, ${minutes} minutes & ${seconds.toString().padStart(2, '0')} seconds`;
  }
  return `${minutes} minutes & ${seconds.toString().padStart(2, '0')} seconds`;
};

const AlbumContent = () => {
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [albumDetails, setAlbumDetails] = useState<AlbumDetails>();
  const apiClient = useApiClient();
  const router = useRouter();

  const { likedSongCheck, addLikeSong, removeLikeSong } = LibraryCheck();

  const { checkAndRefreshToken, handleApiError } = useAuth();

  const { id: albumId } = router.query;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reducerValue = 0;
  let totalDuration = 0;

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
        const tracks = trackResponse.data.items;
        const tracksWithLikeStatus = await Promise.all(
          tracks.map(async (track: Track) => {
            const isLiked = await likedSongCheck(track.id);
            return { ...track, isLiked };
          })
        );

        setAlbumTracks(tracksWithLikeStatus);
        setIsLoading(false);
      } catch (err) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            const [trackResponse, detailResponse] = await Promise.all([
              apiClient.get(`/albums/${albumId}/tracks/?limit=50`),
              apiClient.get(`/albums/${albumId}`),
            ]);

            setAlbumTracks(trackResponse.data.items);
            setAlbumDetails(detailResponse.data);
            await Promise.all(
              albumTracks.map(async (track) => {
                track.isLiked = await likedSongCheck(track.id);
              })
            );
            setIsLoading(false);

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
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handleTrackLike = async (track: Track) => {
    if (track.isLiked) {
      await removeLikeSong(track.id);
      setAlbumTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, isLiked: false } : t))
      );
    } else {
      await addLikeSong(track.id);
      setAlbumTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, isLiked: true } : t))
      );
      track.isLiked = true;
    }
  };

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
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

  totalDuration = albumTracks.reduce(
    (accumulator, currentValue) => accumulator + currentValue.duration_ms,
    reducerValue
  );

  return (
    <div className="flex flex-col mb-28 no-scrollbar">
      <div className="relative">
        <div
          className="absolute inset-0 h-[400px]"
          style={{
            backgroundImage: `url(${albumDetails?.images[0]?.url})`,
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

        <div className="absolute inset-0 h-[400px] bg-gradient-to-b from-transparent via-black/50 to-stone-950 " />

        <div className="relative p-8">
          <div className="flex flex-row justify-between flex-wrap pt-8 ml-2">
            <div className="flex items-end space-x-6 mb-8">
              <img
                src={albumDetails?.images[0]?.url}
                alt={albumDetails?.name}
                className="w-60 h-60 rounded-xl"
              />
              <div className="flex flex-col space-y-2">
                <p className="text-sm uppercase font-extrabold text-neutral-200">
                  Album
                </p>
                <h1 className="text-4xl font-bold text-neutral-200">
                  {albumDetails?.name}
                </h1>
                <div className="flex items-center text-sm">
                  <div className="text-neutral-300 font-bold">
                    {albumDetails?.artists.map((a, index) => {
                      return (
                        <React.Fragment key={a.id}>
                          <Link
                            href={`/artists/${a.id}`}
                            className="hover:underline"
                          >
                            {a.name}
                          </Link>
                          {index < (albumDetails.artists.length || 0) - 1 &&
                            ', '}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <span className="mx-1 text-neutral-400">•</span>
                  <p className="text-neutral-300 font-bold">
                    {albumDetails?.total_tracks} songs
                  </p>
                  <span className="mx-1 text-neutral-400">•</span>
                  <p className="text-neutral-300 font-bold">
                    {formatDuration(totalDuration)}
                  </p>
                </div>

                <div className="play-shuffle gap-x-4 flex flex-row items-end mb-12">
                  <motion.button
                    onClick={handlePlayClick}
                    className="w-24 px-4 py-2 rounded-md flex flex-row justify-center items-center gap-x-2 bg-lemon hover:lime transition"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaPlay size={12} className="text-black" />
                    <p className="text-black font-semibold text-sm">Play</p>
                  </motion.button>
                  <motion.button
                    onClick={handleShuffleClick}
                    className="w-24 px-4 py-2 rounded-md flex flex-row justify-center items-center gap-x-2 bg-lemon hover:bg-lime transition"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PiShuffleBold size={18} className="text-black" />
                    <p className="text-black font-semibold text-sm">Shuffle</p>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="album-content min-w-0 w-full relative z-10 bg-stone-950">
        <div className="grid grid-cols-12 gap-4 px-8">
          <div className="col-span-10 flex items-center justify-start gap-x-2 pl-4">
            <p className="text-neutral-400 text-xs">#</p>
            <p className="text-neutral-400 text-xs">Title</p>
          </div>
          <div className="col-span-1 text-neutral-400 text-xs justify-self-center">{` `}</div>
          <div className="col-span-1 text-neutral-400 text-xs justify-self-end pr-4">
            Time
          </div>

          {albumTracks.map((track, index) => (
            <div
              key={track.id}
              className="track-container col-span-12 grid grid-cols-12 items-center bg-opacity-100 justify-between hover:bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg transition duration-300 px-4 py-4 cursor-pointer"
              onClick={() => handleTrackClick(track.uri, index)}
            >
              <div className="title flex flex-row items-center min-w-0 col-span-10">
                <span className="text-xs text-neutral-400 w-6">
                  {index + 1}
                </span>
                <p className="text-base font-medium text-neutral-300 truncate">
                  {track.name}
                </p>
              </div>
              <button
                className="col-span-1 justify-self-center self-center text-xs text-neutral-300 hover:text-neutral-50 hover:scale-110 transition duration-300"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event from bubbling up
                  handleTrackLike(track);
                }}
              >
                {track.isLiked ? (
                  <IoMdHeart
                    className="text-lemon hover:scale-110 transition duration-300 focus:outline-none"
                    size={18}
                  />
                ) : (
                  <IoMdHeartEmpty
                    className="text-neutral-200 hover:scale-110 transition duration-300 focus:outline-none"
                    size={16}
                  />
                )}
              </button>

              <div className="time-font duration text-xs font-medium text-center justify-self-end text-neutral-300 col-span-1">
                {formatTime(track.duration_ms)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlbumContent;
