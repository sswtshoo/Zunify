// types/spotify.ts
export interface Track {
  album?: {
    name: string;
    id: string;
    images: {
      height: number;
      url: string;
      width: number;
    }[];
  };
  name?: string;
  id?: string;
  uri?: string;
  isLiked?: boolean;
  artists?: {
    name: string;
    id: string;
  }[];
  duration_ms?: number;
}

export interface PlayerState {
  deviceId: string | null;
  isPaused: boolean;
  isActive: boolean;
  currentTrack: Track;
  position: number;
  duration: number;
  volume: number;
}
