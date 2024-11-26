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

interface Playlist {
  id: string;
  name: string;
  description: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

export interface SpotifyResponse<T> {
  data: T;
}

export interface TracksResponse {
  items: TrackItems[];
}

export interface PlaylistsResponse {
  message: string;
  playlists: {
    items: Playlist[];
  };
}

export interface APIResponse<T> {
  data: T;
}
