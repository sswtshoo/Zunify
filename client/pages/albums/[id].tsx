import dynamic from 'next/dynamic';

const AlbumContent = dynamic(() => import('@/components/AlbumContent'), {
  // Dynamically import PlaylistContent with no SSR to avoid hook errors
  ssr: false,
});

const PlaylistPage = () => {
  return <AlbumContent />;
};

export default PlaylistPage;
