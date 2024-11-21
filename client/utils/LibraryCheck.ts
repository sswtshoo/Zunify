import { useAuth } from './useAuth';
import { useApiClient } from './ApiClient';

interface UserPlaylists {
  name: string;
  description: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  href: string;
  id: string;
}

const LibraryCheck = () => {
  const apiClient = useApiClient();

  const likedSongCheck = async (songId: string) => {
    const response = await apiClient.get(`/me/tracks/contains?ids=${songId}`);

    return response.data[0];
  };

  const favoritePlaylistCheck = async (playlistId: string) => {
    let isFollowing = false;

    const response = await apiClient.get(`/me/playlists?limit=50`);

    const playlists: UserPlaylists[] = response.data.items;

    playlists.forEach((playlist) => {
      if (playlist.id === playlistId) {
        isFollowing = true;
      }
    });

    return isFollowing;
  };

  const addLikeSong = async (songId: string) => {
    await apiClient.put(`/me/tracks?ids=${songId}`);
  };

  const removeLikeSong = async (songId: string) => {
    await apiClient.delete(`/me/tracks?ids=${songId}`);
  };

  const favoritePlaylist = async (playlistId: string) => {
    await apiClient.put(`/playlists/${playlistId}/followers`);
  };

  const removeFavoritePlaylist = async (playlistId: string) => {
    await apiClient.delete(`/playlists/${playlistId}/followers`);
  };

  return {
    likedSongCheck,
    favoritePlaylistCheck,
    addLikeSong,
    removeLikeSong,
    favoritePlaylist,
    removeFavoritePlaylist,
  };
};

export default LibraryCheck;
