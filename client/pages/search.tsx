import React, { useState, useEffect, useRef } from 'react';
import { useApiClient } from '@/utils/ApiClient';
import { FaPlay } from 'react-icons/fa';
import { useAuth } from '@/utils/useAuth';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// Adding error boundary

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state to show that an error occurred
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Can log the error to an error reporting service
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="text-red-500 text-center">
          Something went wrong with the search.
        </div>
      );
    }

    return this.props.children;
  }
}

interface ArtistItems {
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  name: string;
  type: 'artist';
}

interface TrackItems {
  id: string;
  uri: string;
  album: {
    images: {
      height: number;
      url: string;
      width: number;
    }[];
  };
  artists: {
    name: string;
  }[];
  name: string;
  type: 'track';
  duration_ms: number;
}

interface ArtistProfile {
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  name: string;
  type: string;
}

interface TopTrack {
  id: string;
  name: string;
  album: {
    images: {
      url: string;
      width: number;
      height: number;
    }[];
    name: string;
  };
  artists: {
    name: string;
  }[];
}

type SearchOptions = ArtistItems | TrackItems;

const msToMinutes = (ms: number) => {
  var minutes = Math.floor(ms / 60000);
  var seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
};

const Search: React.FC = () => {
  const [options, setOptions] = useState<SearchOptions[]>([]);
  const [value, setValue] = useState<string>('');
  const [artist, setArtist] = useState<ArtistProfile | null>();
  const [topfive, setTopfive] = useState<TopTrack[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();

  const keystrokeCountRef = useRef(0);

  const { checkAndRefreshToken, handleApiError } = useAuth();

  //   const updateArtist = async (artistId: string) => {
  //     try {
  //       const response = await apiClient.get(`/artists/${artistId}`);

  //       const response2 = await apiClient.get(`/artists/${artistId}/top-tracks`);

  //       // console.log('Artist Profile: ', JSON.stringify(response.data, null, 2));
  //       // console.log(
  //       //   'Artist top tracks:',
  //       //   JSON.stringify(response2.data, null, 2)
  //       // );

  //       setArtist(response.data);
  //       setTopfive(response2.data);
  //       setError(null);

  //       console.log(artist);
  //     } catch (err: any) {
  //       console.error('Error fetching options: ', err);
  //     }
  //   };

  // Not handling artist search due to rate limit errors -  wasn't able to find a fix

  const handleTrackPlay = async (
    track: TrackItems,
    allTracks: TrackItems[] = []
  ) => {
    try {
      const isTokenValid = await checkAndRefreshToken();
      if (!isTokenValid) {
        window.location.href = 'http://localhost:5174';
        return;
      }

      const tracks = allTracks.length > 0 ? allTracks : [track];
      const trackIndex = allTracks.findIndex((t) => t.id === track.id);

      localStorage.setItem(
        'currentQueue',
        JSON.stringify(tracks.map((t) => ({ track: t })))
      );
      localStorage.setItem('currentTrack', JSON.stringify({ track }));
      localStorage.setItem('currentIndex', trackIndex.toString());
      localStorage.setItem('currentPlaylistId', 'search');

      // Start playback
      await apiClient.put('/me/player/play', {
        uris: tracks.map((t) => t.uri),
        offset: { uri: track.uri },
      });
    } catch (err: any) {
      const refreshSuccessful = await handleApiError(err);
      if (refreshSuccessful) {
        try {
          await apiClient.put('/me/player/play', {
            uris:
              allTracks.length > 0 ? allTracks.map((t) => t.uri) : [track.uri],
            offset: { uri: track.uri },
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

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);

    keystrokeCountRef.current++;

    if (keystrokeCountRef.current >= 4) {
      keystrokeCountRef.current = 0;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        updateOptions(newValue);
      }, 300);
    }
  };

  const calculateRelevance = (item: SearchOptions, query: string): number => {
    const lowercaseQuery = query.toLowerCase();
    const name = item.name.toLowerCase();

    let score = 0;

    if (name === lowercaseQuery) {
      score += 100;
    } else if (name.startsWith(lowercaseQuery)) {
      score += 75;
    } else if (name.includes(lowercaseQuery)) {
      score += 50;
    }

    if (item.type === 'track' && query.split(' ').length === 1) {
      score += 10;
    }

    return score;
  };

  const updateOptions = async (query: string) => {
    try {
      const response = await apiClient.get(
        `/search?q=${query.split(' ').join('%20')}&type=track&limit=10`
      );

      const trackOptions: TrackItems[] = response.data.tracks.items;
      console.log(response.data);

      const combinedResult = [...trackOptions].sort((a, b) => {
        return calculateRelevance(b, query) - calculateRelevance(a, query);
      });

      setOptions(combinedResult);

      if (combinedResult.length > 0) {
        // await updateArtist(combinedResult[0].id);
      } else {
        setArtist(null);
        setTopfive([]);
      }
      console.log(options);
    } catch (err: any) {
      console.error('Error fetching options: ', err);
      setError('Failed to fetch search results. Please try again.');
    }
  };

  useEffect(() => {
    if (value) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        updateOptions(value);
      }, 1000);
    } else {
      setOptions([]);
      setTopfive([]);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  const renderTrackResults = () => {
    if (options.length === 0) return null;

    const topTrack = options[0] as TrackItems;
    const otherTracks = options
      .slice(1, 5)
      .filter((item) => item.type === 'track') as TrackItems[];

    return (
      <div className="flex gap-x-8 items-stretch justify-center mx-8">
        <div className="w-2/5 p-4 flex flex-col items-start justify-center bg-neutral-900 hover:bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg aspect-auto">
          <div className="relative group">
            <img
              src={topTrack?.album.images[0]?.url}
              alt={topTrack.name}
              className="w-32 h-32 object-cover rounded-lg aspect-square self-start group-hover:opacity-70 transition-opacity duration-300"
            />
          </div>
          <div className="w-full flex flex-row justify-between items-start mt-4">
            <div className="track-data">
              <h2 className="text-3xl font-bold text-left">{topTrack.name}</h2>
              <div className="flex gap-x-2 items-start justify-start mt-2">
                <p className="text-neutral-400">Song</p>
                <p className="font-bold">○</p>
                <p className="text-left">{topTrack.artists[0].name}</p>
              </div>
            </div>
            <button
              onClick={() => handleTrackPlay(topTrack, options as TrackItems[])}
              className="w-12 h-12 rounded-full aspect-square flex flex-row justify-center items-center bg-indigo-600 hover:bg-indigo-700 transition-colors hover:scale-105"
            >
              <FaPlay size={16} className="text-white ml-1" />
            </button>
          </div>
        </div>

        <div className="w-3/5 p-4 bg-neutral-900 rounded-lg">
          <h3 className="text-xl font-bold mb-4 ml-4">Other Tracks</h3>
          <ul>
            {otherTracks.map((track) => (
              <div
                key={track.id}
                className="track-container relative flex justify-between items-center hover:bg-gradient-to-br from-neutral-800 to-neutral-900 h-10 rounded-lg transition duration-300 px-4 py-8 cursor-pointer"
                onClick={() => handleTrackPlay(track, options as TrackItems[])}
              >
                <div className="w-1/2 title flex flex-row items-center justify-start gap-x-4">
                  <div className="image-icon relative group flex-shrink-0">
                    <img
                      src={track.album.images[0].url}
                      alt={track.name}
                      height={45}
                      width={45}
                      className="object-cover aspect-square rounded-[0.25rem] group-hover:opacity-70 transition-opacity duration-300"
                    />
                    <FaPlay className="absolute inset-0 m-auto z-10 text-neutral-300 text-base opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <div className="flex flex-col justify-between">
                    <p className="text-base font-semibold text-white truncate">
                      {track.name}
                    </p>
                    <p className="text-sm text-neutral-300 truncate">
                      {track.artists.map((artist) => artist.name).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="durationcont text-sm text-neutral-300 justify-items-end">
                  {msToMinutes(track.duration_ms)}
                </div>
              </div>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="h-full w-full flex flex-col">
        <div className="search-bar-items fixed left-1/2 top-16 -translate-x-1/2">
          <input
            type="text"
            value={value}
            onChange={handleValueChange}
            name="search-input"
            placeholder="Search for a song..."
            className="p-4 w-[30rem] h-12 text-white bg-black rounded-full border border-neutral-400 focus:outline-none focus:border-indigo-500 "
          />
        </div>

        <div className="results-container flex-grow overflow-auto mt-32">
          {renderTrackResults()}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Search;
