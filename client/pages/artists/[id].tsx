import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const ArtistContent = dynamic(() => import('@/components/ArtistContent'), {
  // Dynamically import PlaylistContent with no SSR to avoid hook errors
  ssr: false,
});

const ArtistPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return <ArtistContent />;
};

export default ArtistPage;
