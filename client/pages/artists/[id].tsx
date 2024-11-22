import dynamic from 'next/dynamic';

const ArtistContent = dynamic(() => import('@/components/ArtistContent'), {
  ssr: false,
});

const ArtistPage = () => {
  return <ArtistContent />;
};

export default ArtistPage;
