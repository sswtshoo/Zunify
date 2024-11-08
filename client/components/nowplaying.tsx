import { MdFullscreen } from 'react-icons/md';
import { IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdVolumeHigh, IoMdVolumeOff, IoMdVolumeLow } from 'react-icons/io';
import { IoVolumeMedium } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullscreenPlayer from './FullScreenPlayer';
import { useApiClient } from '@/utils/ApiClient';
import { useAuth } from '@/utils/useAuth';

interface NowPlayingProps {
  className?: string;
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
    artists: {
      name: string;
    }[];
    duration_ms: number;
  };
}

interface PlayerState {
  deviceId: string | null;
  isPaused: boolean;
  isActive: boolean;
  currentTrack: any;
  position: number;
  duration: number;
  volume: number;
}

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const getLocalStorage = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorage = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

export default function NowPlaying({ className }: NowPlayingProps) {
  const [tracks, setTracks] = useState<TrackItems[]>([]);
  const [player, setPlayer] = useState<any>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    deviceId: null,
    isPaused: getLocalStorage('isPaused') === 'true',
    isActive: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.5,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const volumeTimeout = useRef<NodeJS.Timeout | null>(null);

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

  const apiClient = useApiClient();
  const { token } = useAuth();
  const progressRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>();

  useEffect(() => {
    if (!playerState.isPaused && playerState.duration > 0) {
      progressInterval.current = setInterval(() => {
        setPlayerState((prev) => ({
          ...prev,
          position: Math.min(prev.position + 10, prev.duration),
        }));
      }, 10);
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
  }, [playerState.isPaused, playerState.duration]);

  const initializePlayer = useCallback(async () => {
    if (!token || !window.Spotify) return;

    const spotifyPlayer = new window.Spotify.Player({
      name: 'Zunify Web Player',
      getOAuthToken: (cb: (token: string) => void) => cb(token),
      volume: playerState.volume,
    });

    spotifyPlayer.addListener(
      'initialization_error',
      ({ message }: { message: string }) => {
        console.error('Failed to initialize', message);
      }
    );

    spotifyPlayer.addListener(
      'authentication_error',
      ({ message }: { message: string }) => {
        console.error('Failed to authenticate', message);
      }
    );

    spotifyPlayer.addListener(
      'account_error',
      ({ message }: { message: string }) => {
        console.error('Failed to validate Spotify account', message);
      }
    );

    spotifyPlayer.addListener(
      'playback_error',
      ({ message }: { message: string }) => {
        console.error('Failed to perform playback', message);
      }
    );

    spotifyPlayer.addListener('player_state_changed', (state: any) => {
      if (!state) return;

      const newPausedState = state.paused;
      setLocalStorage('isPaused', newPausedState.toString());

      setPlayerState((prev) => ({
        ...prev,
        isPaused: state.paused,
        currentTrack: state.track_window.current_track,
        position: state.position,
        duration: state.duration,
      }));
    });

    spotifyPlayer.addListener(
      'ready',
      ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setPlayerState((prev) => ({ ...prev, deviceId: device_id }));

        apiClient.put('me/player', {
          device_ids: [device_id],
          play: false,
        });
      }
    );

    spotifyPlayer.connect();
    setPlayer(spotifyPlayer);

    return () => {
      spotifyPlayer.disconnect();
    };
  }, [token]);

  const togglePlay = async () => {
    if (!player) return;
    await player.togglePlay();
    const newIsPaused = !playerState.isPaused;
    setPlayerState((prev) => ({ ...prev, isPaused: newIsPaused }));
    setLocalStorage('isPaused', newIsPaused.toString());
  };

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isInputActive =
        document.activeElement?.tagName.toLowerCase() === 'input' ||
        document.activeElement?.tagName.toLowerCase() === 'textarea';

      if (event.code === 'Space' && !isInputActive) {
        event.preventDefault(); // preventing the default page scroll behaviour
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay]);

  useEffect(() => {
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
          .filter((t) => t?.track?.uri) // Filter out any tracks without uri
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
  }, [playerState.deviceId]);

  const nextTrack = async () => {
    if (!player) return;

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
    if (!player) return;

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

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  return (
    <>
      <div
        className={twMerge(
          'fixed flex items-center justify-between bg-black bg-opacity-10 backdrop-blur-2xl px-4',
          className
        )}
      >
        <div className="flex items-center space-x-4 w-1/3 px-6">
          <div
            className="relative group cursor-pointer h-14 w-14"
            onClick={() => setIsFullscreen(true)}
          >
            {playerState.currentTrack?.album?.images[0] && (
              <>
                <img
                  src={playerState.currentTrack.album.images[0].url}
                  alt="Album art"
                  className="w-full h-full object-cover rounded-sm group-hover:opacity-80 transition-opacity"
                />
                <MdFullscreen
                  size={20}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate">
              {playerState.currentTrack?.name || 'No track playing'}
            </p>
            <p className="text-xs text-neutral-400 truncate">
              {playerState.currentTrack?.artists
                ?.map((a: any) => a.name)
                .join(', ')}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center w-1/3 ">
          <div className="flex items-center self-center space-x-6">
            <IoPlaySkipBack
              size={18}
              className="text-white cursor-pointer hover:text-neutral-300 transition-colors"
              onClick={previousTrack}
            />
            <button
              onClick={togglePlay}
              className="bg-transparent rounded-full p-2 hover:scale-105 transition-transform focus:outline-none"
            >
              {playerState.isPaused ? (
                <FaPlay className="text-white ml-0.5 " size={24} />
              ) : (
                <FaPause className="text-white" size={24} />
              )}
            </button>
            <IoPlaySkipForward
              size={18}
              className="text-white cursor-pointer hover:text-neutral-300 transition-colors"
              onClick={nextTrack}
            />
          </div>

          <div className="w-full flex items-center text-xs text-neutral-300">
            <span className="w-14 text-center mr-2">
              {formatTime(playerState.position)}
            </span>
            <div
              className="relative flex-1 h-1 group"
              onMouseDown={handleProgressClick}
              ref={progressRef}
            >
              <div className="absolute inset-y-0 w-full -inset-x-2 cursor-pointer transition-all duration-150 flex items-center justify-center">
                <div className="w-full h-1 bg-neutral-600 self-center">
                  <div
                    className="h-full bg-white rounded-full relative transition-all duration-150 group-hover:bg-indigo-600"
                    style={{
                      width: `${(playerState.position / playerState.duration) * 100}%`,
                    }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  </div>
                </div>
              </div>
            </div>
            <span className="w-14 text-left ml-2">
              {formatTime(playerState.duration)}
            </span>
          </div>
        </div>

        <div className="w-1/3 flex justify-end items-center">
          <div
            className="relative flex items-center"
            onMouseEnter={() => {
              if (volumeTimeout.current) clearTimeout(volumeTimeout.current);
              setIsVolumeHovered(true);
            }}
            onMouseLeave={() => {
              volumeTimeout.current = setTimeout(
                () => setIsVolumeHovered(false),
                300
              );
            }}
          >
            <button
              onClick={toggleMute}
              className="text-neutral-400 hover:text-white transition-colors p-2 mr-6"
            >
              {playerState.volume === 0 ? (
                <IoMdVolumeOff size={20} />
              ) : playerState.volume < 0.3 ? (
                <IoMdVolumeLow size={20} />
              ) : playerState.volume < 0.7 ? (
                <IoVolumeMedium size={20} />
              ) : (
                <IoMdVolumeHigh size={20} />
              )}
            </button>
            <div
              className={`
              flex items-center w-0 overflow-hidden transition-all duration-300
              ${isVolumeHovered ? 'w-24' : 'w-0'}
            `}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={playerState.volume}
                onChange={handleVolumeChange}
                className="w-full accent-indigo-500 cursor-pointer border-none h-2 mr-6 ml-0"
              />
            </div>
          </div>
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
