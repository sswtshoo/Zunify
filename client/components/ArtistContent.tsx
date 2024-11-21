import React, { useState, useEffect } from 'react';
import { useApiClient } from '@/utils/ApiClient';
import { useAuth } from '@/utils/useAuth';
import { FaPlay } from 'react-icons/fa';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface Track {
  id: string;
  name: string;
  uri: string;
  artists: {
    name: string;
    id: string;
  }[];
  album: {
    name: string;
    id: string;
    images: {
      height: number;
      url: string;
      width: number;
    }[];
  };
  duration_ms: number;
  popularity: number;
}

interface Album {
  id: string;
  name: string;
  album_type: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  release_date: string;
  uri: string;
}

interface Artists {
  id: string;
  name: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
}

const formatTime = (ms: number) => {
  var minutes = Math.floor(ms / 60000);
  var seconds = ((ms % 60000) / 1000 - 1).toFixed(0);
  return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
};

const ArtistContent = () => {
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [relatedArtists, setRelatedArtists] = useState<Artists[]>([]);
  const [artist, setArtist] = useState<Artists>();
  const [albums, setAlbums] = useState<Album[]>([]);
  const router = useRouter();
  const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkAndRefreshToken, handleApiError } = useAuth();

  const { id: artistId } = router.query;

  useEffect(() => {
    const fetchAllData = async () => {
      if (!artistId) {
        setError('Invalid artist id');
        setIsLoading(false);
        return;
      }

      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) return;

        const [
          artistResponse,
          tracksResponse,
          artistsResponse,
          albumsResponse,
        ] = await Promise.all([
          apiClient.get(`/artists/${artistId}`),
          apiClient.get(`/artists/${artistId}/top-tracks?limit=10`),
          apiClient.get(`/artists/${artistId}/related-artists?limit=10`),
          apiClient.get(`/artists/${artistId}/albums?limit=50`),
        ]);

        setArtist(artistResponse.data);
        setTopTracks(tracksResponse.data.tracks);
        setRelatedArtists(artistsResponse.data.artists);
        setAlbums(albumsResponse.data.items);

        setError(null);
      } catch (err: any) {
        const refreshSuccessful = await handleApiError(err);

        if (refreshSuccessful) {
          try {
            const [tracksResponse, artistsResponse, albumsResponse] =
              await Promise.all([
                apiClient.get(`/artists/${artistId}/top-tracks?limit=10`),
                apiClient.get(`/artists/${artistId}/related-artists?limit=10`),
                apiClient.get(`/artists/${artistId}/albums?limit=50`),
              ]);

            console.log('Tracks Response: ', tracksResponse);
            console.log('Artists Response: ', artistsResponse);
            console.log('Albums response: ', albumsResponse);
            setError(null);
          } catch (retryErr) {
            setError('Failed to fetch artists page after token refresh');
          }
        } else if (err.response?.status === 429) {
          setError('Error fetching playlist data');
        } else {
          setError('Error fetching playlist data');
          console.error('Error fetching playlist data:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (artistId) {
      fetchAllData();
    }
  }, [artistId]);

  const albumType = albums.filter((item) => item.album_type === 'album');
  const singleType = albums.filter((item) => item.album_type === 'single');
  const sortedTracks = topTracks.sort((a, b) => b.popularity - a.popularity);

  const trackUris = sortedTracks.map((track) => track.uri);

  const handleTrackClick = async (track: Track, index: number) => {
    if (sortedTracks.length > 0) {
      try {
        const isTokenValid = await checkAndRefreshToken();
        if (!isTokenValid) {
          window.location.href = 'http://localhost:5174';
          return;
        }

        localStorage.setItem('currentQueue', JSON.stringify(sortedTracks));
        localStorage.setItem('currentTrack', JSON.stringify(sortedTracks[0]));
        localStorage.setItem('currentIndex', index.toString());

        await apiClient.put('/me/player/play', {
          uris: trackUris,
          offset: { position: index },
        });
      } catch (err: any) {
        const refreshSuccessful = await handleApiError(err);
        if (refreshSuccessful) {
          try {
            await apiClient.put('/me/player/play', {
              uris: trackUris,
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
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="h-12 w-12 rounded-full animate-spin bg-transparent border-b-8 border-indigo-500 border-dotted self-center"></div>
      </div>
    );
  }

  return (
    <>
      <div className="">
        <div className="flex flex-col mb-24">
          <div className="relative">
            <div
              className="absolute inset-0 h-[400px]"
              style={{
                backgroundImage: `url(${artist?.images[1]?.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(125px)',
                opacity: '0.6',
                maskImage:
                  'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, rgb(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
              }}
            />
            <div className="absolute inset-0 h-[400px] bg-gradient-to-b from-transparent via-black/50 to-stone-950" />

            <div className="relative p-8">
              <div className="flex flex-row justify-start flex-wrap pt-8">
                <div className="flex items-end space-x-6 mb-8">
                  <img
                    src={artist?.images[1].url}
                    alt={artist?.name}
                    className="w-60 h-60 shadow-2xl rounded-lg z-0"
                  />
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm uppercase font-bold text-white">
                      Artist
                    </p>
                    <h1 className="text-4xl font-bold text-white">
                      {artist?.name}
                    </h1>
                  </div>
                </div>
              </div>
            </div>
            <div className="top-tracks min-w-0 w-full flex flex-col gap-y-8 mt-8">
              <h3 className="text-3xl font-bold font-white ml-4">Popular</h3>
              <div className="grid grid-cols-2 grid-rows-5 gap-x-6">
                {sortedTracks.map((track, index) => (
                  <div
                    className="flex justify-between items-center mx-4 group relative flex-shrink-0 hover:bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg transition duration-300 px-4 py-4"
                    key={index}
                    onClick={() => handleTrackClick(track, index)}
                  >
                    <div className="index-title flex items-center gap-x-4">
                      <img
                        src={track.album.images[1].url}
                        alt={track.name}
                        height={40}
                        width={40}
                        className="aspect-square rounded-lg group-hover:opacity-70 transition-opacity duration-300"
                      />
                      <p className="text-neutral-200 text-base font-light">
                        {track.name}
                      </p>
                    </div>
                    <p className="text-sm font-neutral-300">
                      {formatTime(track.duration_ms)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="albums-singles flex flex-col w-full gap-y-8 mt-8">
              <h3 className="text-3xl font-bold font-white ml-4">Albums</h3>
              <div className="flex flex-row flex-nowrap overflow-x-auto max-w-full ml-8 mr-8">
                <div className="flex-auto flex flex-row gap-x-6 w-40">
                  {albumType.map((album) => (
                    <Link
                      href={`/albums/${album.id}`}
                      className="flex flex-col cursor-default hover:opacity-65 transition-opacity duration-300 group"
                    >
                      <img
                        src={album.images[1].url}
                        alt={album.name}
                        height={200}
                        width={200}
                        className="aspect-square rounded-lg"
                      />
                      <p className="text-neutral-200 font-medium text-base text-wrap w-48 mt-2 line-clamp-2 truncate group-hover:shadow-xs group-hover:shadow-stone-800">
                        {album.name}
                      </p>
                      <div className="flex flex-row items-center justify-start gap-x-2">
                        <p className="text-neutral-300 font-normal text-xs mt-2">
                          {new Date(album.release_date).getFullYear()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <h3 className="text-3xl font-bold font-white ml-4">
                Singles and EPs
              </h3>
              <div className="flex flex-row flex-nowrap overflow-x-auto max-w-full ml-8 mr-8">
                <div className="flex-auto flex flex-row gap-x-6 w-40">
                  {singleType.map((album) => (
                    <Link
                      href={`/albums/${album.id}`}
                      className="flex flex-col cursor-default hover:opacity-65 transition-opacity duration-300"
                    >
                      <img
                        src={album.images[1].url}
                        alt={album.name}
                        height={200}
                        width={200}
                        className="aspect-square rounded-lg"
                      />
                      <p className="text-neutral-200 font-medium text-base text-wrap w-48 mt-2 line-clamp-2 truncate">
                        {album.name}
                      </p>
                      <div className="flex flex-row items-center justify-start gap-x-2">
                        <p className="text-neutral-300 font-normal text-xs mt-2">
                          {new Date(album.release_date).getFullYear()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtistContent;
