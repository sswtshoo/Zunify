import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Sidebar from '../components/sidebar';
import { TokenProvider } from '@/context/TokenProvider';
import { useEffect, useContext, useState } from 'react';
import { TokenContext } from '@/context/TokenProvider';
import LibraryCheck from '@/utils/LibraryCheck';
import '../styles/globals.css';
import Script from 'next/script';
import { PlayerState, Track } from '@/types/Spotify';
import dynamic from 'next/dynamic';
import { NextComponentType, NextPageContext } from 'next';
import { motion } from 'motion/react';

interface AppContentProps {
  Component: NextComponentType<NextPageContext, any, any>;
  pageProps: any;
}

const DynamicNowPlaying = dynamic(() => import('../components/nowplaying'), {
  ssr: false,
});

interface SpotifyReadyEvent {
  device_id: string;
}

interface SpotifyEvent {
  message: string;
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

function AppContent({ Component, pageProps }: AppContentProps) {
  const router = useRouter();
  const tokenContext = useContext(TokenContext);
  const [playerState, setPlayerState] = useState<PlayerState>({
    deviceId: null,
    isPaused: true,
    isActive: false,
    currentTrack: {},
    position: 0,
    duration: 0,
    volume: 0.6,
  });
  const [spotifyPlayer, setSpotifyPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const { likedSongCheck } = LibraryCheck();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        window.onSpotifyWebPlaybackSDKReady = () => {
          const player = new window.Spotify.Player({
            name: 'Zunify Web Player',
            getOAuthToken: (cb: (token: string) => void) => cb(token),
            volume: playerState.volume,
          });

          player.addListener('ready', ({ device_id }: SpotifyReadyEvent) => {
            console.log('Ready with Device ID', device_id);
            setDeviceId(device_id);

            if (token) {
              fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  device_ids: [device_id],
                  play: true,
                }),
              });
            }
          });

          player.addListener(
            'player_state_changed',
            async (state: SpotifyPlayerState) => {
              if (!state) return;

              const currentTrackId = state.track_window.current_track.id;
              let isLiked = false;

              if (currentTrackId) {
                try {
                  isLiked = await likedSongCheck(currentTrackId);
                } catch (error) {
                  console.error('Error checking like status:', error);
                }
              }

              const newState = {
                ...playerState,
                isPaused: state.paused,
                currentTrack: {
                  ...state.track_window.current_track,
                  isLiked,
                },
                position: state.position,
                duration: state.duration,
                isActive: true,
              };

              navigator.mediaSession.playbackState = state.paused
                ? 'playing'
                : 'paused';

              setPlayerState(newState);

              if ('mediaSession' in navigator) {
                const track = newState?.currentTrack || {};

                const artworkUrl = track?.album?.images?.[0]?.url;

                const metadata = {
                  title: track?.name || 'Unknown Title',
                  artist:
                    track?.artists?.map((artist) => artist.name).join(', ') ||
                    'Unknown Artist',
                  album: track?.album?.name || 'Unknown Album',
                  artwork: artworkUrl
                    ? [
                        {
                          src: artworkUrl,
                          sizes: '640x640',
                          type: 'image/jpeg',
                        },
                      ]
                    : [],
                };

                // console.log('Setting MediaMetadata:', metadata);

                try {
                  navigator.mediaSession.metadata = new MediaMetadata(metadata);
                } catch (error) {
                  console.error('Failed to set MediaMetadata:', error);
                }
              }

              localStorage.setItem('playerState', JSON.stringify(newState));
            }
          );

          player.addListener(
            'initialization_error',
            ({ message }: SpotifyEvent) => {
              console.error('Failed to initialize', message);
            }
          );

          player.addListener(
            'authentication_error',
            ({ message }: SpotifyEvent) => {
              console.error('Failed to authenticate', message);
            }
          );

          player.addListener('account_error', ({ message }: SpotifyEvent) => {
            console.error('Failed to validate Spotify account', message);
          });

          player.connect();
          setSpotifyPlayer(player);
        };
      }
    }
  }, [playerState.volume, likedSongCheck]);

  useEffect(() => {
    const handleToken = async () => {
      if (typeof window === 'undefined' || !router.isReady) return;

      const { access_token, expires_in } = router.query;

      if (access_token && expires_in) {
        const token = Array.isArray(access_token)
          ? access_token[0]
          : access_token;
        const expiry = Array.isArray(expires_in)
          ? parseInt(expires_in[0])
          : parseInt(expires_in);
        const expiryTime = Date.now() + expiry * 1000;

        localStorage.setItem('access_token', token);
        localStorage.setItem('token_expiry', expiryTime.toString());

        if (tokenContext) {
          tokenContext.setAccessToken(token);
          tokenContext.setTokenExpiry(expiryTime);
        }

        const { access_token: _, expires_in: __, ...restQuery } = router.query;
        router.replace(
          {
            pathname: router.pathname,
            query: restQuery,
          },
          undefined,
          { shallow: true }
        );
        return;
      }

      const storedToken = localStorage.getItem('access_token');
      const storedExpiry = localStorage.getItem('token_expiry');

      if (
        !storedToken ||
        !storedExpiry ||
        Date.now() >= parseInt(storedExpiry)
      ) {
        window.location.href = 'http://localhost:5174';
      }
    };

    handleToken();
  }, [router.isReady, router.query, tokenContext]);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      document.body.classList.add('scrolling');
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('scrolling');
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  // useEffect(() => {
  //   console.log(window.Spotify);
  // }, []);

  // console.log(playerState.currentTrack.album?.images);

  return (
    <div className="h-screen w-screen flex flex-row bg-stone-950">
      <Sidebar className="flex-shrink-0 w-[275px]" />
      <motion.div className="content-container flex flex-col flex-grow w-full h-full relative">
        <div className="main-content flex-grow overflow-auto">
          <Component {...pageProps} />
        </div>
      </motion.div>
      <DynamicNowPlaying
        className="h-24 mx-auto max-w-full"
        deviceId={deviceId}
        player={spotifyPlayer}
        playerState={playerState}
        setPlayerState={setPlayerState}
      />
    </div>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TokenProvider>
      <Script
        src="https://sdk.scdn.co/spotify-player.js"
        strategy="afterInteractive"
      />
      <title>Zunify</title>
      <AppContent Component={Component} pageProps={pageProps} />
    </TokenProvider>
  );
}
