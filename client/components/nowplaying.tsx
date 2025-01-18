import { MdFullscreen } from 'react-icons/md';
import { IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdVolumeHigh, IoMdVolumeOff, IoMdVolumeLow } from 'react-icons/io';
import { IoVolumeMedium } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';
import React, { useState, useEffect, useRef } from 'react';
import FullscreenPlayer from './FullScreenPlayer';
import { useApiClient } from '@/utils/ApiClient';
import LibraryCheck from '@/utils/LibraryCheck';
import AnimatedAlbumArt from './AnimatedArt';
import { PlayerState, Track } from '@/types/Spotify';
import Link from 'next/link';
import { motion } from 'motion/react';
import { HeartStraight, ArrowsOutSimple } from '@phosphor-icons/react';

interface NowPlayingProps {
  className?: string;
  deviceId: string | null;
  player: SpotifyPlayer | null;
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
}

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
    isLiked?: boolean;
    artists: {
      name: string;
      id: string;
      uri: string;
    }[];
    duration_ms: number;
  };
}

interface SpotifyPlayerState {
  paused: boolean;
  track_window: {
    current_track: Track & {
      id: string;
      album: {
        name: string;
        id: string;
        images: Array<{
          height: number;
          url: string;
          width: number;
        }>;
      };
      artists: Array<{
        name: string;
        id: string;
        uri: string;
      }>;
      name: string;
      uri: string;
    };
  };
  position: number;
  duration: number;
}

interface SpotifyError {
  message: string;
}

interface SpotifyReady {
  device_id: string;
}

type SpotifyPlayerEvents = {
  initialization_error: SpotifyError;
  authentication_error: SpotifyError;
  account_error: SpotifyError;
  playback_error: SpotifyError;
  player_state_changed: SpotifyPlayerState;
  ready: SpotifyReady;
};

interface SpotifyPlayer {
  togglePlay: () => Promise<void>;
  volume: number;
  setVolume: (volume: number) => Promise<void>;
  seek: (position: number) => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  addListener: <T extends keyof SpotifyPlayerEvents>(
    eventName: T,
    callback: (state: SpotifyPlayerEvents[T]) => void
  ) => void;
}

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export default function NowPlaying({
  className,
  deviceId,
  player,
  playerState,
  setPlayerState,
}: NowPlayingProps) {
  const [tracks, setTracks] = useState<TrackItems[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCheckingLikeStatus, setIsCheckingLikeStatus] = useState(false);

  const { likedSongCheck, addLikeSong, removeLikeSong } = LibraryCheck();
  const [apiClientReady, setApiClientReady] = useState(false);

  const apiClient = useApiClient();

  const progressRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiClientReady(true);
    }
  }, []);

  useEffect(() => {
    if (!playerState.isPaused && playerState.duration > 0) {
      progressInterval.current = setInterval(() => {
        setPlayerState((prev) => ({
          ...prev,
          position: Math.min(prev.position + 50, prev.duration),
        }));
      }, 50);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [playerState.isPaused, playerState.duration, setPlayerState]);

  const togglePlay = async () => {
    if (!player) return;

    try {
      await player.togglePlay();
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isInputActive =
        document.activeElement?.tagName.toLowerCase() === 'input' ||
        document.activeElement?.tagName.toLowerCase() === 'textarea';

      if (event.code === 'Space' && !isInputActive) {
        event.preventDefault(); // to prevent the default page scroll behaviour
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay]);

  useEffect(() => {
    if (player) {
      player.addListener(
        'player_state_changed',
        (state: SpotifyPlayerState) => {
          if (state) {
            setPlayerState((prevState) => ({
              ...prevState,
              isPaused: state.paused,
              currentTrack: {
                ...state.track_window.current_track,
                isLiked: prevState.currentTrack.isLiked,
              },
              position: state.position,
              duration: state.duration,
            }));
          }
        }
      );
    }
  }, [player, playerState.currentTrack.isLiked]);

  useEffect(() => {
    const checkSongLiked = async () => {
      if (!playerState.currentTrack?.id || isCheckingLikeStatus) return;

      try {
        setIsCheckingLikeStatus(true);
        const isLiked = await likedSongCheck(playerState.currentTrack.id);

        setPlayerState((prev) => {
          if (prev.currentTrack?.id === playerState.currentTrack.id) {
            return {
              ...prev,
              currentTrack: { ...prev.currentTrack, isLiked },
            };
          }
          return prev;
        });
      } catch (error) {
        console.error('Error checking like status:', error);
      } finally {
        setIsCheckingLikeStatus(false);
      }
    };

    checkSongLiked();
  }, [playerState.currentTrack?.id]);

  useEffect(() => {
    if (!apiClientReady) return;

    const savedQueue = localStorage.getItem('currentQueue');
    const savedTrack = localStorage.getItem('currentTrack');

    if (savedQueue) {
      const parsedQueue = JSON.parse(savedQueue);
      setTracks(parsedQueue);
    }

    if (savedTrack && playerState.deviceId && tracks.length > 0) {
      try {
        const track = JSON.parse(savedTrack);
        const trackUris = tracks
          .filter((t) => t?.track?.uri)
          .map((t) => t.track.uri);

        if (trackUris.length > 0 && track?.track?.uri) {
          apiClient
            .put(`me/player/play?device_id=${playerState.deviceId}`, {
              uris: trackUris,
              offset: { uri: track.track.uri },
            })
            .then(() => {
              const trackIndex = tracks.findIndex(
                (t) => t?.track?.uri === track?.track?.uri
              );
              if (trackIndex !== -1) {
                localStorage.setItem('currentIndex', trackIndex.toString());
              }
            })
            .catch((error) => {
              console.error('Error starting playback:', error);
            });
        }
      } catch (error) {
        console.error('Error parsing saved track:', error);
      }
    }
  }, [playerState.deviceId, apiClientReady]);

  const nextTrack = async () => {
    if (!player || !apiClientReady) return;

    try {
      const currentPlaylistId = localStorage.getItem('currentPlaylistId');
      let currentIndex = parseInt(localStorage.getItem('currentIndex') || '0');
      const queue = JSON.parse(localStorage.getItem('currentQueue') || '[]');

      if (currentPlaylistId && queue.length > 0) {
        currentIndex = (currentIndex + 1) % queue.length;

        await apiClient.post('/me/player/next');

        localStorage.setItem('currentIndex', currentIndex.toString());
        localStorage.setItem(
          'currentTrack',
          JSON.stringify(queue[currentIndex])
        );
      }
    } catch (error) {
      console.error('Error playing next track:', error);
    }
  };

  const previousTrack = async () => {
    if (!player || !apiClientReady) return;

    try {
      const currentPlaylistId = localStorage.getItem('currentPlaylistId');
      let currentIndex = parseInt(localStorage.getItem('currentIndex') || '0');
      const queue = JSON.parse(localStorage.getItem('currentQueue') || '[]');

      if (currentPlaylistId && queue.length > 0) {
        currentIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;

        await apiClient.post('/me/player/previous');

        localStorage.setItem('currentIndex', currentIndex.toString());
        localStorage.setItem(
          'currentTrack',
          JSON.stringify(queue[currentIndex])
        );
      }
    } catch (error) {
      console.error('Error playing previous track:', error);
    }
  };

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playerState.isPaused
        ? 'paused'
        : 'playing';

      if (playerState.currentTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: playerState.currentTrack.name,
          artist: playerState.currentTrack.artists
            ?.map((a) => a.name)
            .join(', '),
          album: playerState.currentTrack.album?.name,
          artwork:
            playerState.currentTrack.album?.images?.map((img) => ({
              src: img.url,
              sizes: `${img.width}x${img.height}`,
              type: 'image/jpeg',
            })) || [],
        });
      }
    }
  }, [playerState.isPaused, playerState.currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', async () => {
        if (playerState.isPaused) {
          await togglePlay();
        }
      });

      navigator.mediaSession.setActionHandler('pause', async () => {
        if (!playerState.isPaused) {
          await togglePlay();
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
      navigator.mediaSession.setActionHandler('previoustrack', previousTrack);

      return () => {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      };
    }
  }, [playerState.isPaused, togglePlay, nextTrack, previousTrack]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (!player) return;

    try {
      await player.setVolume(newVolume);
      setPlayerState((prev) => ({ ...prev, volume: newVolume }));
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const toggleMute = async () => {
    if (!player) return;

    try {
      const newVolume = playerState.volume > 0 ? 0 : 0.5;
      await player.setVolume(newVolume);
      setPlayerState((prev) => ({ ...prev, volume: newVolume }));
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleProgressClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !playerState.duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const seekPosition = Math.floor(position * playerState.duration);

    setPlayerState((prev) => ({ ...prev, position: seekPosition }));

    if (!player) return;
    await player.seek(seekPosition);
  };

  const handleTrackLike = async () => {
    if (!playerState.currentTrack?.id || isCheckingLikeStatus) return;

    const trackId = playerState.currentTrack.id;
    const wasLiked = playerState.currentTrack.isLiked;

    try {
      setIsCheckingLikeStatus(true);

      setPlayerState((prev) => ({
        ...prev,
        currentTrack: { ...prev.currentTrack, isLiked: !wasLiked },
      }));

      if (wasLiked) {
        await removeLikeSong(trackId);
      } else {
        await addLikeSong(trackId);
      }
    } catch (error) {
      console.error('Error updating track like status:', error);
      setPlayerState((prev) => ({
        ...prev,
        currentTrack: { ...prev.currentTrack, isLiked: wasLiked },
      }));
    } finally {
      setIsCheckingLikeStatus(false);
    }
  };

  // console.log(playerState.currentTrack);

  return (
    <>
      <div
        className={twMerge(
          'fixed bottom-0 right-0 left-0 flex items-center justify-between bg-gray-700 bg-opacity-10 border-t-[0.5px] border-neutral-300 border-opacity-25 backdrop-blur-3xl px-4 z-10',
          className
        )}
      >
        <div className="flex items-center justify-items-start space-x-4 w-1/3 px-6">
          <div
            className="relative group cursor-pointer h-14 w-14"
            onClick={() => setIsFullscreen(true)}
          >
            {playerState.currentTrack?.album?.images[0] && (
              <>
                <AnimatedAlbumArt
                  imageUrl={
                    playerState.currentTrack?.album?.images[0]?.url ||
                    playerState.currentTrack?.album?.images[1]?.url ||
                    playerState.currentTrack?.album?.images[2]?.url
                  }
                  isPlaying={!playerState.isPaused}
                  className="h-14 w-14"
                />
              </>
            )}
          </div>
          <div className="max-w-[80%]">
            <p className="text-sm font-bold text-white truncate">
              {playerState.currentTrack?.name || 'No track playing'}
            </p>

            <div className="text-xs font-medium text-neutral truncate">
              {playerState.currentTrack?.artists?.map((artist, index) => {
                const artistId = artist.uri?.split(':')[2];
                return (
                  <span key={artistId}>
                    {index > 0 && ', '}
                    <Link
                      href={`/artists/${artistId}`}
                      className="hover:underline"
                    >
                      {artist.name}
                    </Link>
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTrackLike();
            }}
          >
            {playerState.currentTrack?.isLiked ? (
              <HeartStraight
                size={18}
                className="text-lemon focus:outline-none hover:scale-125 transition duration-300"
                weight="fill"
              />
            ) : (
              <HeartStraight
                size={16}
                className="text-neutral-200 focus:outline-none hover:scale-125 transition duration-300"
                weight="bold"
              />
            )}
          </button>
        </div>

        <div className="flex flex-col items-center w-1/3 ">
          <div className="flex items-center self-center space-x-6">
            <IoPlaySkipBack
              size={18}
              className="text-neutral-100 cursor-pointer hover:text-neutral-300 transition-colors"
              onClick={previousTrack}
            />
            <button
              onClick={togglePlay}
              className="bg-transparent rounded-full p-2 hover:scale-110 transition-transform focus:outline-none checked:scale-110"
            >
              {playerState.isPaused ? (
                <FaPlay className="text-neutral-100 ml-0.5" size={24} />
              ) : (
                <FaPause className="text-neutral-100" size={24} />
              )}
            </button>
            <IoPlaySkipForward
              size={18}
              className="text-neutral-100 cursor-pointer hover:text-neutral-300 transition-colors"
              onClick={nextTrack}
            />
          </div>

          <div className="w-full flex items-center justify-between text-xs text-neutral-300">
            <span className="time-font w-14 text-xs text-center">
              {formatTime(playerState.position)}
            </span>
            <motion.div
              className="relative flex-1 h-[5px] group rounded-full"
              onMouseDown={handleProgressClick}
              ref={progressRef}
            >
              <div className="absolute inset-y-0 w-full cursor-pointer transition-all duration-150 flex items-center justify-center">
                <div className="w-full h-[5px] rounded-full bg-neutral-600 self-center">
                  <motion.div
                    className="h-full bg-white rounded-full relative transition-all duration-150 group-hover:bg-white"
                    style={{
                      width: `${((playerState.position + 1000) / playerState.duration) * 100}%`,
                    }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
            <span className="time-font w-14 text-xs text-center">
              {formatTime(playerState.duration)}
            </span>
          </div>
        </div>

        <div className="w-1/3 flex justify-end items-center px-6">
          <motion.button
            onClick={() => setIsFullscreen(true)}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <ArrowsOutSimple
              className="text-neutral-400 hover:text-neutral-200"
              weight="bold"
              size={16}
            />
          </motion.button>
        </div>
      </div>

      {isFullscreen && (
        <FullscreenPlayer
          currentTrack={playerState.currentTrack}
          isPlaying={!playerState.isPaused}
          onClose={() => setIsFullscreen(false)}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onPrevious={previousTrack}
          position={playerState.position}
          duration={playerState.duration}
          onSeek={handleProgressClick}
          volume={playerState.volume}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
        />
      )}
    </>
  );
}
