import dynamic from 'next/dynamic';

const PlaylistContent = dynamic(() => import('@/components/PlaylistContent'), {
  // Dynamically import PlaylistContent with no SSR to avoid hook errors
  ssr: false,
});

const PlaylistPage = () => {
  return <PlaylistContent />;
};

export default PlaylistPage;
